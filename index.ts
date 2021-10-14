#!/usr/bin/env node
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getMeta } from './src/scrapers/meta'

// https://www.facebook.com/events/752782582049701
// https://www.facebook.com/events/2524032241028447/
// https://www.facebook.com/events/730457857630881

require('yargs')
  .command(
    'event <url>',
    'Get event info',
    () => {},
    async (args: any) => {
      let result = await getMeta(args.url)

      if (!result) {
        if (args.url.includes('facebook.com')) {
          result = await getFacebookEvent(args.url)
        }

        if (args.url.includes('latindancecalendar.com')) {
          result = await getLatinDanceCalendarEvent(args.url)
        }
      }

      console.log(result)
    }
  )
  .help()
  .alias('help', 'h')
  .strictCommands().argv
