#!/usr/bin/env node
import * as moment from 'moment'
import * as _progress from 'cli-progress'
import * as chalk from 'chalk'
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getMeta, getMetaEvent } from './src/scrapers/schema.org'
import { readFiles } from './src/utils/filesystem'
import save from './src/exporters/yaml'
import config from './config'
import { getDocuments } from './src/firebase/database'
import { finish } from './src/puppeteer/browser'
import { getEventList } from './src/scraper'
import {
  getUrlContentId,
  getUrlProvider,
  isFacebookEvent,
} from './src/utils/url'
import { getEventsFromCalendar } from './src/utils/ical'

const multibar = new _progress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    stopOnComplete: true,
    forceRedraw: true,
  },
  {
    format:
      chalk.white(' {bar}') +
      ' {percentage}% | ETA: {eta_formatted} | {value}/{total} | {title}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  }
)

interface Job {
  provider: string
  action: string
  url: string
  started: number
  startedAt: Date
  finished?: number
  finishedAt?: Date
  total?: number
  processed?: number
  failed?: number
  duration?: string
  status?: string
}

let verbose = false
let job: Job | null = null
let progress: _progress.Bar | null = null

function debug(...args: any[]) {
  if (verbose) {
    console.log(...args)
  }
}

async function jobStart(provider: string, action: string, url: string) {
  job = {
    provider,
    action,
    url,
    started: Date.now(),
    startedAt: new Date(),
  }

  if (!verbose) {
    progress = multibar.create(0, 0, {
      title: `${action} ${provider}`,
    })
  }
}

function jobProgress(total: number, processed: number, title?: string) {
  if (!progress) {
    return
  }

  progress.setTotal(total)
  progress.update(processed, { title })
}

async function jobFinish(
  status: string,
  total: number,
  processed: number,
  failed: number
) {
  if (!job) {
    throw new Error('No job started')
  }

  job.finished = Date.now()
  job.finishedAt = new Date()
  job.total = total
  job.status = status
  job.processed = processed
  job.failed = failed

  const time = job.finished - job.started
  const seconds = moment.duration(time).seconds()
  const minutes = moment.duration(time).minutes()

  job.duration = `${minutes}m ${seconds}s`

  await save(`${config.jobsPath}/${job.started}.yml`, job)

  job = null
}

async function getEventInfo(url: string) {
  let result = null

  debug()
  debug(chalk.green('getEventInfo'), url)

  if (
    url.includes('facebook.com') ||
    url.includes('fb.me') ||
    url.includes('fb.com')
  ) {
    debug(chalk.gray('Requesting facebook...'))
    result = await getFacebookEvent(url)
  }

  if (url.includes('latindancecalendar.com')) {
    debug(chalk.gray('Requesting latindancecalendar...'))
    result = await getLatinDanceCalendarEvent(url)
  }

  if (!result) {
    debug(chalk.gray('Requesting schema...'))
    result = await getMetaEvent(url)
  }

  if (result) {
    result.downloadedAt = new Date()
    debug(
      `Downloaded from ${result.provider}: ${result.name} at ${result.startDate} in ${result.addressCountry}`
    )
  } else {
    debug(chalk.red('Failed'))
  }

  return result
}

require('yargs')
  .boolean('verbose')
  .boolean('force')
  .boolean('retry')
  .command(
    'update <provider>',
    'Update information about events of specific provider',
    () => {},
    async (args: any) => {
      verbose = args.verbose

      await jobStart(args.provider, 'update', args.provider)

      debug(chalk.green(`Updating`), args.provider)

      const events = await readFiles(`${config.eventsPath}/${args.provider}`)

      const filteredEvents = events.filter(
        (e: any) => e.processed === args.force && e.failed === args.retry
      )

      let processed = 0
      let failed = 0
      let total = filteredEvents.length

      debug(`Total:`, events.length)
      debug(`Filtered:`, total)

      for (const event of filteredEvents) {
        const providerId = event.id || event.providerId
        const provider = event.provider || event.source || 'spreadsheet'

        try {
          jobProgress(total, processed, event.name)

          const url = event.facebook || event.providerUrl || event.url
          if (!url) {
            throw new Error('No url')
          }

          const result = await getEventInfo(url)

          if (!result) {
            throw new Error('No result')
          }

          await save(
            `${config.eventsPath}/${result.provider}/${result.providerId}.yml`,
            {
              ...result,
              provider,
              providerId,
              processed: true,
              processedAt: new Date(),
            }
          )

          if (result.provider !== args.provider) {
            await save(
              `${config.eventsPath}/${args.provider}/${providerId}.yml`,
              {
                ...event,
                processed: true,
                processedAt: new Date(),
              }
            )
          }
        } catch (e) {
          const error = (e as any)?.message

          await save(
            `${config.eventsPath}/${args.provider}/${providerId}.yml`,
            {
              ...event,
              failed: true,
              failedAt: new Date(),
              error,
            }
          )

          failed++

          debug(chalk.red(error))
        }

        processed++
        jobProgress(total, processed)
      }

      await jobFinish('finished', total, processed, failed)
      await finish()
    }
  )
  .command(
    'list <url>',
    'Get list of events from provider',
    () => {},
    async (args: any) => {
      await jobStart(getUrlProvider(args.url), 'list', args.url)

      const result = await getEventList(args.url)

      await jobFinish('finished', result.count, result.count, 0)

      await save(`${config.providersPath}/${result.id}.yml`, {
        id: result.id,
        url: result.url,
        updatedAt: new Date(),
      })

      for (const event of result.items) {
        await save(
          `${config.eventsPath}/${event.provider}/${event.providerId}.yml`,
          event
        )
      }

      await finish()
    }
  )
  .command(
    'event <url>',
    'Get event info',
    () => {},
    async (args: any) => {
      await jobStart('console', 'add-event', args.url)

      let result
      let status = 'failed'
      let error = ''
      let processed = 0
      let failed = 0

      const provider = getUrlProvider(args.url)
      const providerId = getUrlContentId(args.url)

      try {
        result = await getEventInfo(args.url)
      } catch (e) {
        error = (e as any)?.message

        debug('Error', error)
      }

      if (!result?.startDate && providerId) {
        result = {
          provider,
          providerId,
          providerUrl: args.url,
          addedAt: new Date(),
          failed: true,
          failedAt: new Date(),
          error: error || 'No result',
        }

        failed++
      } else {
        processed++
      }

      if (result) {
        await save(
          `${config.eventsPath}/${result.provider}/${result.providerId}.yml`,
          result
        )

        status = 'finished'
      }

      await jobFinish(status, 1, processed, failed)
      await finish()
    }
  )
  .command(
    'export:events',
    'Export events from database',
    () => {},
    async (args: any) => {
      const events = await getDocuments('events')

      for (const event of events) {
        await save(`${config.eventsPath}/wedance.vip/${event.id}.yml`, event)
      }
    }
  )
  .command(
    'export:profiles',
    'Export profiles from database',
    () => {},
    async (args: any) => {
      const profiles = await getDocuments('profiles')

      for (const profile of profiles) {
        await save(`${config.profilesPath}/profiles/${profile.id}.yml`, profile)
      }
    }
  )
  .command(
    'export:accounts',
    'Export accounts from database',
    () => {},
    async (args: any) => {
      const profiles = await getDocuments('accounts')

      for (const profile of profiles) {
        await save(`${config.profilesPath}/accounts/${profile.id}.yml`, profile)
      }
    }
  )
  .command(
    'ical <url>',
    'Get events from ical',
    () => {},
    async (args: any) => {
      const events = await getEventsFromCalendar(args.url)

      for (const item of events) {
        const event: any = { ...item }
        event.provider = 'ical'
        event.providerId = item.uid
        event.addedAt = new Date()

        if (!event.name) {
          event.name = event.summary
        }

        if (event.url && isFacebookEvent(event.url)) {
          event.facebook = event.url
        }

        await save(
          `${config.eventsPath}/${event.provider}/${event.providerId}.yml`,
          event
        )
      }
    }
  )
  .command(
    'meta <url>',
    'Get meta of url',
    () => {},
    async (args: any) => {
      const meta = await getMeta(args.url)

      console.log(meta)
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
