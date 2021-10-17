import * as _ from 'lodash'
import * as chalk from 'chalk'
import config from './config'
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getMetaEvent } from './src/scrapers/schema.org'
import { readFiles } from './src/utils/filesystem'
import { getEventList } from './src/scraper'
import { Event } from './src/entity/event'
import { Job, currentJob } from './src/entity/job'
import { Provider } from './src/entity/provider'

export function debug(...args: any[]) {
  if (currentJob) {
    currentJob.log(...args)
  }
}

export async function getEventInfo(url: string) {
  let result = null

  if (
    url.includes('facebook.com') ||
    url.includes('fb.me') ||
    url.includes('fb.com')
  ) {
    debug(chalk.gray('Requesting facebook...'))
    result = await getFacebookEvent(url)
  }

  if (url.includes('latindancecalendar.com')) {
    debug(chalk.gray('Requesting latindancecalendar...'))
    result = await getLatinDanceCalendarEvent(url)
  }

  if (!result) {
    debug(chalk.gray('Requesting schema...'))
    result = await getMetaEvent(url)
  }

  if (result) {
    debug(
      `Downloaded from ${result.provider}: ${result.name} at ${result.startDate} in ${result.addressCountry}`
    )
  } else {
    debug(chalk.red('Failed'))
  }

  return result
}

export async function add(url: string) {
  const job = new Job('console', 'add', url)
  let item

  try {
    item = await getEventInfo(url)
  } catch (e) {
    item = item || {}
    item.error = (e as any)?.message
  }

  const event = new Event(item)
  await event.update(item)

  await job.finish('finished', 1, 1, 0)
}

export async function pull(provider: Provider) {
  if (!provider.id) {
    throw new Error('Provider: not specified')
  }
  const job = new Job(provider.id, 'pull')

  let total = 0
  let processed = 0
  let failed = 0

  let processedUrls = 0
  let totalUrls = provider.data.urls.length

  for (const url of provider.data.urls) {
    await job.progress({ total: totalUrls, processed: processedUrls, url })

    const result = await getEventList(url)
    total += result.count
    processedUrls++

    for (const item of result.items) {
      const event = new Event(item)
      await event.update(item)
    }
  }

  await job.finish('finished', total, processed, failed)

  await provider.update({
    lastCount: job.data.total,
    lastDuration: job.data.duration,
  })
}

export async function sync(provider: Provider, force: boolean, retry: boolean) {
  if (!provider.id) {
    throw new Error('Provider: not specified')
  }
  const job = new Job(provider.id, 'sync')

  const events = await readFiles(`${config.eventsPath}/${provider}`)

  const filteredEvents = events.filter(
    (e: any) => e.processed === force && e.failed === retry
  )

  let processed = 0
  let failed = 0
  let total = filteredEvents.length

  job.log(`Total:`, events.length)
  job.log(`Filtered:`, total)

  for (const event of filteredEvents) {
    const providerId = event.id
    const providerUrl = event.url
    const provider = event.source

    const sourceEvent = new Event(event)

    try {
      job.progress({ total, processed, name: event.name })

      const url = event.facebook || event.url || event.providerUrl
      if (!url) {
        throw new Error('No url')
      }

      const result = await getEventInfo(url)

      if (!result) {
        throw new Error('No result')
      }

      const richEvent = new Event(result)
      richEvent.update({
        ...result,
        provider,
        providerId,
        providerUrl,
      })

      sourceEvent.update({
        processed: true,
        processedAt: new Date(),
      })
    } catch (e) {
      const error = (e as any)?.message

      sourceEvent.update({
        failed: true,
        failedAt: new Date(),
        error,
      })

      failed++

      job.log(chalk.red(error))
    }

    processed++
    job.progress({ total, processed })
  }

  await job.finish('finished', total, processed, failed)
}
