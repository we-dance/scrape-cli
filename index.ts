#!/usr/bin/env node
import * as _progress from 'cli-progress'
import { getMeta } from './src/scrapers/schema.org'
import { getDirs, readFiles } from './src/utils/filesystem'
import save from './src/exporters/yaml'
import config from './config'
import { getDocuments } from './src/firebase/database'
import { finish } from './src/puppeteer/browser'
import { getUrlContentId, isFacebookEvent } from './src/utils/url'
import { getEventsFromCalendar } from './src/utils/ical'
import { add, sync, pull } from './lib'
import { Provider } from './src/entity/provider'

require('yargs')
  .boolean('verbose')
  .boolean('force')
  .boolean('retry')
  .command(
    'sync [provider]',
    'Sync events information',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose

      let providers: any[] = []

      if (args.provider) {
        providers = [args.provider]
      } else {
        providers = getDirs(config.eventsPath)
      }

      for (const item of providers) {
        const provider = new Provider(item)
        await sync(provider, args.force, args.retry)
      }

      await finish()
    }
  )
  .command(
    'pull [provider]',
    'Get list of events',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose

      const providers = readFiles(config.providersPath)
      let filteredProviders = providers

      if (args.provider) {
        filteredProviders = providers.filter((p: any) => p.id === args.provider)
      }

      for (const item of filteredProviders) {
        const provider = new Provider(item)
        await pull(provider)
      }

      await finish()
    }
  )
  .command(
    'add <url>',
    'Add url',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose

      await add(args.url)

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
      const calendarUrl = args.url.replace('/0.ics', '')
      const providerId = getUrlContentId(calendarUrl)

      for (const item of events) {
        const event: any = { ...item }
        event.provider = 'ical'
        event.providerId = providerId
        event.providerEvent = item.uid
        event.id = item.uid
        event.addedAt = new Date()

        if (!event.name) {
          event.name = event.summary
        }

        if (event.url && isFacebookEvent(event.url)) {
          event.facebook = event.url
        }

        if (!event.id) {
          continue
        }

        await save(
          `${config.eventsPath}/${event.provider}/${event.id}.yml`,
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
