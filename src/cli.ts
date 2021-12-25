#!/usr/bin/env node
import * as _progress from 'cli-progress'
import { getDirs, readFiles } from './utils/filesystem'
import config from './config'
import { finish } from './puppeteer/browser'
import { add, sync, pull } from './lib'
import { Provider } from './entity/provider'

require('yargs')
  .count('verbose')
  .alias('v', 'verbose')
  .boolean('force')
  .boolean('silent')
  .boolean('retry')
  .command(
    'sync [provider]',
    'Sync events information',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose
      config.force = args.force
      config.retry = args.retry
      config.silent = args.silent

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
      config.silent = args.silent

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
      config.silent = args.silent

      await add(args.url, args.name, 'console')

      await finish()
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
