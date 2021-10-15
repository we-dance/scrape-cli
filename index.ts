#!/usr/bin/env node
import * as moment from 'moment'
import * as _progress from 'cli-progress'
import * as chalk from 'chalk'
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getMeta } from './src/scrapers/schema.org'
import { readFiles } from './src/utils/filesystem'
import save from './src/exporters/yaml'
import config from './config'
import { getDocuments } from './src/firebase/database'
import { finish } from './src/puppeteer/browser'
import { getEventList } from './src/scraper'
import { getUrlProvider } from './src/utils/url'

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
  started: number
  startedAt: Date
  finished?: number
  finishedAt?: Date
  total?: number
  processed?: number
  duration?: string
  status?: string
}

let verbose = false
let job: Job | null = null

function debug(...args: any[]) {
  if (verbose) {
    console.log(...args)
  }
}

async function jobStart(provider: string, action: string, url: string) {
  job = {
    provider,
    action,
    started: Date.now(),
    startedAt: new Date(),
  }
}

async function jobFinish(total: number, status: string) {
  if (!job) {
    throw new Error('No job started')
  }

  job.finished = Date.now()
  job.finishedAt = new Date()
  job.total = total
  job.status = status

  const time = job.finished - job.started
  const seconds = moment.duration(time).seconds()
  const minutes = moment.duration(time).minutes()

  job.duration = `${minutes}m ${seconds}s`

  await save(`${config.jobsPath}/${job.started}.yml`, job)

  job = null
}

async function getEventInfo(url: string) {
  let result = null

  if (
    url.includes('facebook.com') ||
    url.includes('fb.me') ||
    url.includes('fb.com')
  ) {
    result = await getFacebookEvent(url)
  }

  if (url.includes('latindancecalendar.com')) {
    result = await getLatinDanceCalendarEvent(url)
  }

  if (!result) {
    result = await getMeta(url)
  }

  if (result) {
    result.downloadedAt = new Date()
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

      debug(`reading`, `${config.eventsPath}/${args.provider}`)

      const events = await readFiles(`${config.eventsPath}/${args.provider}`)

      debug(`events total`, events.length)

      const filteredEvents = events.filter(
        (e: any) => e.processed === args.force && e.failed === args.retry
      )

      let processed = 0
      let total = filteredEvents.length

      debug(`filtered events`, total)

      const totalProgress = multibar.create(total, 0, {
        title: 'Downloading events',
      })

      for (const event of filteredEvents) {
        const providerId = event.id || event.providerId
        const provider = event.provider || event.source || 'spreadsheet'

        try {
          totalProgress.update(processed, { title: event.name })

          const result = await getEventInfo(event.facebook || event.providerUrl)

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

          console.log(
            `\n\nError: ${error}\nEvent: ${event.name}\nUrl: ${event.facebook}\n\n`
          )
        }

        processed++
        totalProgress.update(processed)
      }

      await jobFinish(total, 'finished')
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

      await jobFinish(result.count, 'finished')

      await save(`${config.providersPath}/${result.id}.yml`, {
        id: result.id,
        url: result.url,
        count: result.count,
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
      const result = await getEventInfo(args.url)

      if (result?.startDate) {
        await save(
          `${config.eventsPath}/${result.provider}/${result.providerId}.yml`,
          result
        )
      } else {
        console.log('Event not found')
      }

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
  .help()
  .alias('help', 'h')
  .strictCommands().argv
