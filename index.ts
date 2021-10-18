#!/usr/bin/env node
import * as _progress from 'cli-progress'
import { getDirs, readFiles } from './src/utils/filesystem'
import save from './src/exporters/yaml'
import config from './config'
import { getDocuments } from './src/firebase/database'
import { finish } from './src/puppeteer/browser'
import { add, sync, pull } from './lib'
import { Provider } from './src/entity/provider'

const argv = require('yargs')
  .boolean('v')
  .boolean('vv')
  .boolean('vvv')
  .boolean('force')
  .boolean('retry')
  .command(
    'sync [provider]',
    'Sync events information',
    () => {},
    async (args: any) => {
      let providers: any[] = []

      if (args.provider) {
        providers = [args.provider]
      } else {
        providers = getDirs(`${config.eventsDatabase}/events`)
      }

      for (const id of providers) {
        const provider = new Provider({ id })
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
    'add <url>',
    'Add url',
    () => {},
    async (args: any) => {
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

config.vvv = argv.vvv
config.vv = argv.vv || config.vvv
config.v = argv.v || config.vv
