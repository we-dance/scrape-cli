#!/usr/bin/env node
import * as _progress from 'cli-progress'
import { getDirs, readFiles } from './utils/filesystem'
import save from './exporters/yaml'
import config from './config'
import { getDocuments } from './firebase/database'
import { finish } from './puppeteer/browser'
import { add, sync, pull } from './lib'
import { Provider } from './entity/provider'

require('yargs')
  .count('verbose')
  .alias('v', 'verbose')
  .boolean('force')
  .boolean('retry')
  .command(
    'sync [provider]',
    'Sync events information',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose
      config.force = args.force
      config.retry = args.retry

      let providers: any[] = []

      if (args.provider) {
        providers = [args.provider]
      } else {
        providers = getDirs(`${config.eventsDatabase}/events`)
      }

      for (const id of providers) {
        const provider = new Provider({ id })
        await sync(provider)
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

      const providers = readFiles(`${config.eventsDatabase}/providers`)
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
    'add <url> [name]',
    'Add url',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose

      await add(args.url, args.name, 'console')

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
        await save(
          `${config.eventsDatabase}/events/wedance.vip/${event.id}.yml`,
          event
        )
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
        await save(
          `${config.usersDatabase}/profiles/${profile.id}.yml`,
          profile
        )
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
        await save(
          `${config.usersDatabase}/accounts/${profile.id}.yml`,
          profile
        )
      }
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
