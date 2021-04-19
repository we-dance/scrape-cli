#!/usr/bin/env node
import { getEvent } from './src/scrapers/facebook'

require('yargs')
  .command(
    'fb:event <id>',
    'List items',
    () => {},
    async (args: any) => {
      const result = await getEvent(args.id)

      console.log(result)
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
