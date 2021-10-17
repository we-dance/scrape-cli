import * as _ from 'lodash'
import * as chalk from 'chalk'
import config from './config'
import { getFacebookEvent } from './src/scrapers/facebook'
import { getLatinDanceCalendarEvent } from './src/scrapers/latindancecalendar.com'
import { getEvent as getEventSchemaHtml } from './src/scrapers/schema.html'
import { getEvent as getEventSchemaMeta } from './src/scrapers/schema.meta'
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

  debug(chalk.gray('Requesting meta schema...'))
  result = await getEventSchemaMeta(url)

  if (!result) {
    debug(chalk.gray('Requesting html schema...'))
    result = await getEventSchemaHtml(url)
  }

  if (
    url.includes('facebook.com') ||
    url.includes('fb.me') ||
    url.includes('fb.com')
  ) {
    debug(chalk.gray('Requesting facebook...'))
    const extra = await getFacebookEvent(url)

    result = {
      ...result,
      ...extra,
    }
  }

  if (url.includes('latindancecalendar.com')) {
    debug(chalk.gray('Requesting latindancecalendar...'))
    const extra = await getLatinDanceCalendarEvent(url)

    result = {
      ...result,
      ...extra,
    }
  }

  if (result) {
    if (result.location && result.address) {
      delete result.address
    }

    debug(
      `Downloaded from ${result.source}: ${result.name} at ${
        result.startDate
      } in ${result.location?.address?.addressCountry || 'Uknown city'}`
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

    try {
      const result = await getEventList(url)
      total += result.count
      processedUrls++

      for (const item of result.items) {
        const event = new Event(item)
        await event.update(item)
      }
      processed++
    } catch (e) {
      failed++
    }
  }

  await job.finish('finished', total, processed, failed)

  await provider.update({
    lastPullCount: job.data.total,
    lastPullDuration: job.data.duration,
    pulledAt: new Date(),
  })
}

export async function sync(provider: Provider, force: boolean, retry: boolean) {
  if (!provider.id) {
    throw new Error('Provider: not specified')
  }
  const job = new Job(provider.id, 'sync')

  const events = await readFiles(
    `${config.eventsDatabase}/events/${provider.id}`
  )

  let filteredEvents = events.filter((e: any) => e.failed === retry)

  if (!force) {
    filteredEvents = filteredEvents.filter((e: any) => !e.processed)
  }

  filteredEvents = events.filter(
    (e: any) => e.processed === force && e.failed === retry
  )

  let processed = 0
  let failed = 0
  let total = filteredEvents.length

  job.log(
    `Processing ${total} of ${
      events.length
    } (force: ${!!force}, retry: ${!!retry})`
  )

  for (const event of filteredEvents) {
    event.source = event.source || event.provider

    const providerInfo = {
      providerId: event.id,
      providerUrl: event.url,
      provider: event.source,
    }

    let url = event.facebook || event.url || event.providerUrl
    if (!url && event.source === 'facebook.com' && event.id) {
      url = `https://facebook.com/events/${event.id}`
    }

    const sourceEvent = new Event(event, 'sourceEvent')

    job.progress({ total, processed, name: event.name, url })

    try {
      if (!url) {
        throw new Error('No url')
      }

      const result = await getEventInfo(url)

      if (!result) {
        throw new Error('No result')
      }

      const richEvent = new Event(result, 'richEvent')
      await richEvent.update({
        ...result,
        ...providerInfo,
        processed: true,
        processedAt: new Date(),
      })

      if (richEvent.data.source !== sourceEvent.data.source) {
        await sourceEvent.update({
          processed: true,
          processedAt: new Date(),
        })
      }
    } catch (e) {
      const error = (e as any)?.message

      await sourceEvent.update({
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
  await provider.update({
    lastSyncCount: job.data.total,
    lastSyncDuration: job.data.duration,
    syncedAt: new Date(),
  })
}
