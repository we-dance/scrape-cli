import * as _ from 'lodash'
import * as chalk from 'chalk'
import config from './config'
import { readFiles } from './src/utils/filesystem'
import { parse } from './src/scraper'
import { Event } from './src/entity/event'
import { Job, currentJob } from './src/entity/job'
import { Provider } from './src/entity/provider'

export function debug(...args: any[]) {
  if (currentJob) {
    currentJob.log(...args)
  }
}

export async function add(url: string) {
  const job = new Job('console', 'add', url)

  let total = 0
  let processed = 0
  let failed = 0

  try {
    total++
    const result = await parse(url)

    for (const item of result.items) {
      const event = new Event(item)
      await event.update(item)
    }

    processed++

    if (result.count) {
      job.addProvider({ id: result.items[0].source, urls: [url] })
    }
  } catch (e) {
    job.data.error = (e as any)?.message

    job.log(chalk.red(`Error: ${job.data.error}`))

    failed++
  }

  await job.finish('finished', total, processed, failed)
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
      const result = await parse(url, 'list')
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

    const sourceEvent = new Event(event, 'source')

    job.progress({ total, processed, name: event.name, url })

    try {
      if (!url) {
        throw new Error('No url')
      }

      const result = await parse(url, 'item')

      for (const item of result.items) {
        const richEvent = new Event(item, item.parser)

        await richEvent.update({
          ...item,
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
  }

  await job.finish('finished', total, processed, failed)
  await provider.update({
    lastSyncCount: job.data.total,
    lastSyncDuration: job.data.duration,
    syncedAt: new Date(),
  })
}
