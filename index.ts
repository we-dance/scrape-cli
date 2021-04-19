#!/usr/bin/env node
import { getEvent } from './src/scrapers/facebook'

require('yargs')
  .command(
    'fb:event <id>',
    'List items',
    () => {},
    async (args: any) => {
      await getEvent(args.id)
      process.exit(0)
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
