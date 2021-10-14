#!/usr/bin/env node
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getMeta } from './src/scrapers/meta'
import { readFiles } from './src/utils/filesystem'
import save from './src/exporters/yaml'
import config from './config'
import { getDocuments } from './src/firebase/database'

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
  .command(
    'spreadsheet',
    'Get events from spreadsheet',
    () => {},
    async (args: any) => {
      const events = await readFiles(`${config.eventsPath}/spreadsheet`)
      for (const event of events) {
        if (!event.facebook || event.processed) {
          continue
        }

        const result = await getEventInfo(event.facebook)

        await save(
          `${config.eventsPath}/${result.source}/${result.id}.yml`,
          result
        )

        event.processed = true
        event.processedAt = new Date()
        await save(`${config.eventsPath}/spreadsheet/${event.id}.yml`, event)
      }
    }
  )
  .command(
    'event <url>',
    'Get event info',
    () => {},
    async (args: any) => {
      const result = await getEventInfo(args.url)
      await save(
        `${config.eventsPath}/${result.source}/${result.id}.yml`,
        result
      )
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
