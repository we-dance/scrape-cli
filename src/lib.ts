import * as _ from 'lodash'
import * as chalk from 'chalk'
import { parse } from './scraper'
import { Event } from './entity/event'
import { Job, currentJob, finishJob } from './entity/job'
import { Provider } from './entity/provider'
import { getRepository } from './orm/orm'

export function debug(...args: any[]) {
  if (currentJob) {
    currentJob.log(...args)
  } else {
    console.log(...args)
  }
}

export async function add(url: string, name: string, source: string) {
  const job = new Job(source, 'add', url)

  let total = 0
  let processed = 0
  let failed = 0

  try {
    total++
    const result = await parse(url)

    for (const item of result.items) {
      await getRepository(Event).update(item, item)
    }

    processed++

    if (result.count) {
      job.addProvider({ name, id: result.items[0].source, urls: [url] })
    }
  } catch (e) {
    job.data.error = (e as any)?.message

    job.log(chalk.red(`Error: ${job.data.error}`))

    failed++
  }

  return await finishJob('finished', total, processed, failed)
}

export async function pull(provider: Provider) {
  if (!provider.data.id) {
    throw new Error('Provider: not specified')
  }

  if (!provider.data.urls) {
    return
  }

  const job = new Job(provider.data.id, 'pull')

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
        await getRepository(Event).update(item.id, item)
      }

      processed++
    } catch (e) {
      failed++
    }
  }

  await finishJob('finished', total, processed, failed)

  await getRepository(Provider).update(provider.data.id, {
    lastPullCount: job.data.total,
    lastPullDuration: job.data.duration,
    pulledAt: new Date(),
  })
}

export async function sync(provider: Provider) {
  if (!provider.data.id) {
    throw new Error('Provider: not specified')
  }

  const job = new Job(provider.data.id, 'sync')

  const events = await getRepository(Event).find({
    where: { source: provider.data.id },
  })

  let processed = 0
  let failed = 0
  let total = events.length

  job.log(`Processing ${total} events`)

  for (const eventEntity of events) {
    const event = eventEntity.data

    event.source = event.source || event.provider

    const providerInfo = {
      providerId: event.id,
      providerUrl: event.url,
      provider: event.source,
    }

    const sourceEvent = event

    event.url = event.facebook || event.url || event.providerUrl
    if (!event.url && event.source === 'facebook.com' && event.id) {
      const facebookId = event.id.replace('@facebook.com', '')
      event.url = `https://facebook.com/events/${facebookId}`
    }

    job.progress({ total, processed, name: event.name, url: event.url })

    try {
      if (!event.url) {
        throw new Error('No url')
      }

      const result = await parse(event.url, 'item')

      let lastItem = null

      for (const item of result.items) {
        lastItem = item

        await getRepository(Event).update(item.id, {
          ...item,
          ...providerInfo,
          processed: true,
          processedAt: new Date(),
        })
      }

      if (event.source !== lastItem?.source) {
        await getRepository(Event).update(sourceEvent.id, {
          processed: true,
          processedAt: new Date(),
          redirected: true,
          redirectedTo: lastItem.id,
        })
      }
    } catch (e) {
      const error = (e as any)?.message

      await getRepository(Event).update(sourceEvent.id, {
        failed: true,
        failedAt: new Date(),
        error,
      })

      failed++

      job.log(chalk.red(error))
    }

    processed++
  }

  await finishJob('finished', total, processed, failed)
  await getRepository(Provider).update(provider.data.id, {
    lastSyncCount: job.data.total,
    lastSyncDuration: job.data.duration,
    syncedAt: new Date(),
  })
}
