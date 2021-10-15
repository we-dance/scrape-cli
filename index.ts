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
  .boolean('force')
  .boolean('retry')
  .command(
    'proccess <provider>',
    'Process events of provider',
    () => {},
    async (args: any) => {
      const events = await readFiles(`${config.eventsPath}/${args.provider}`)
      const filteredEvents = events.filter(
        (e: any) =>
          e.facebook && e.processed === args.force && e.failed === args.retry
      )

      let processed = 0
      let total = filteredEvents.length

      const totalProgress = multibar.create(total, 0, {
        title: 'Downloading events',
      })

      for (const event of filteredEvents) {
        const providerId = event.id || event.providerId
        const provider = event.provider || event.source || 'spreadsheet'

        try {
          totalProgress.update(processed, { title: event.name })

          const result = await getEventInfo(event.facebook)

          if (!result) {
            await save(
              `${config.eventsPath}/${args.provider}/${providerId}.yml`,
              {
                ...event,
                failed: true,
                failedAt: new Date(),
                empty: true,
              }
            )

            processed++
            continue
          }

          await save(`${config.eventsPath}/${result.source}/${result.id}.yml`, {
            ...result,
            provider,
            providerId,
          })

          await save(
            `${config.eventsPath}/${args.provider}/${providerId}.yml`,
            {
              ...event,
              processed: true,
              processedAt: new Date(),
            }
          )
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

      await finish()
    }
  )
  .command(
    'pull <url>',
    'Add provider and get event list',
    () => {},
    async (args: any) => {
      const started = Date.now()
      const startedAt = new Date()

      const result = await getEventList(args.url)

      const finished = Date.now()
      const finishedAt = new Date()

      await save(`${config.jobsPath}/${started}.yml`, {
        id: result.id,
        url: result.url,
        count: result.count,
        startedAt,
        finishedAt,
        duration: moment
          .duration((finished - started) / 1000, 'seconds')
          .humanize(),
        // duration: moment.duration((finished - started) / 1000, "seconds").format("h [hrs]: m [min]: s [sec]")
      })

      await save(`${config.providersPath}/${result.id}.yml`, {
        id: result.id,
        url: result.url,
        count: result.count,
        updatedAt: new Date(),
      })

      for (const event of result.items) {
        await save(
          `${config.eventsPath}/latindancecalendar.com/${event.providerId}.yml`,
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
