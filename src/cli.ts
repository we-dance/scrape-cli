#!/usr/bin/env node
import * as _progress from 'cli-progress'
import config from './config'
import { finish } from './puppeteer/browser'
import { add, sync, pull } from './lib'
import { Provider } from './entity/provider'
import { getRepository } from './orm/orm'
import { plugin as FacebookEventPlugin } from './plugins/20.facebook.event'
import { plugin as SchemaEventPlugin } from './plugins/10.schema.meta'

require('yargs')
  .count('verbose')
  .alias('v', 'verbose')
  .boolean('silent')
  .command(
    'sync [provider]',
    'Sync events information',
    () => {},
    async (args: any) => {
      config.verbose = args.verbose
      config.silent = args.silent

      await sync(args.provider)

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

      const provider = await getRepository(Provider).findOne(args.provider)
      await pull(provider)

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
  .command(
    'debug:fb <url>',
    'Debug facebook event',
    () => {},
    async (args: any) => {
      if (!FacebookEventPlugin.getItem) {
        return
      }

      config.verbose = args.verbose

      const event = await FacebookEventPlugin.getItem(args.url)

      console.log(event)

      await finish()
    }
  )
  .command(
    'debug:schema <url>',
    'Debug schema event',
    () => {},
    async (args: any) => {
      if (!SchemaEventPlugin.getItem) {
        return
      }

      config.verbose = args.verbose

      const event = await SchemaEventPlugin.getItem(args.url)

      console.log(event)

      await finish()
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
