import * as _progress from 'cli-progress'
import * as chalk from 'chalk'
import * as moment from 'moment'
import { Entity } from '../orm'
import config from '../config'
import { Organiser } from './organiser'
import { Provider } from './provider'
import { getRepository } from '../orm'

export interface JobData {
  id: number
  provider: string
  action: string
  urls?: string[]
  startedAt: Date
  finishedAt?: Date
  total?: number
  processed?: number
  failed?: number
  duration?: string
  status?: string
  error?: string
  logs?: string[]
}

export interface JobProgress {
  total: number
  processed: number
  name?: string
  url?: string
}

export let currentJob: any = null
let progress: _progress.Bar | null = null

export class Job extends Entity {
  collection = 'jobs'

  data: JobData
  organisers: any[]
  providers: any[]

  constructor(provider: string, action: string, url?: string) {
    super()

    this.organisers = []
    this.providers = []

    this.data = {
      id: Date.now(),
      provider,
      action,
      startedAt: new Date(),
      urls: [],
      logs: [],
    }

    currentJob = this

    if (url) {
      this.data.urls?.push(url)
    }

    this.log()
    this.log(chalk.green(action), `from ${provider}`)

    if (!config.verbose) {
      const multibar = new _progress.MultiBar(
        {
          clearOnComplete: false,
          hideCursor: true,
          stopOnComplete: true,
          forceRedraw: true,
        },
        {
          format:
            chalk.white(' {bar}') +
            ' {percentage}% | ETA: {eta_formatted} | {value}/{total} | {title}',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
        }
      )

      progress = multibar.create(0, 0, {
        title: `${action} ${provider}`,
      })
    }
  }

  addOrganiser(data: any) {
    if (!this.organisers.find((i) => i.id === data.id)) {
      this.organisers.push(data)
    }
  }

  addProvider(data: any) {
    if (!this.providers.find((i) => i.id === data.id)) {
      this.providers.push(data)
    }
  }

  log(...args: any[]) {
    if (config.verbose > 0) {
      console.log(...args)
    }

    this.data.logs?.push(args.join(' '))
  }

  progress({ total, processed, name, url }: JobProgress) {
    this.data.total = total
    this.data.processed = processed

    if (url && !this.data.urls?.includes(url)) {
      this.data.urls?.push(url)
    }

    if (progress) {
      progress.setTotal(total)
      progress.update(processed, { name })
    }

    this.log()
    this.log(
      chalk.green(this.data.action),
      chalk.yellow(`${processed}/${total}`),
      this.data.provider,
      name || '',
      url || ''
    )
  }
}

export async function finishJob(
  status: string,
  total: number,
  processed: number,
  failed: number
) {
  if (!currentJob) {
    throw new Error('No current job')
  }

  if (progress) {
    progress.setTotal(total)
    progress.update(processed, { name: status })
  }

  currentJob.data.finishedAt = new Date()
  currentJob.data.total = total
  currentJob.data.status = status
  currentJob.data.processed = processed
  currentJob.data.failed = failed

  const time =
    currentJob.data.finishedAt.getTime() - currentJob.data.startedAt.getTime()
  const seconds = moment.duration(time).seconds()
  const minutes = moment.duration(time).minutes()

  currentJob.data.duration = `${minutes}m ${seconds}s`

  for (const item of currentJob.organisers) {
    await getRepository(Organiser).update(item)
  }

  for (const item of currentJob.providers) {
    await getRepository(Provider).update(item)
  }

  currentJob.log()
  currentJob.log(
    chalk.green(
      `🎉 ${currentJob.data.status} with ${currentJob.data.total} items, ${currentJob.organisers.length} organisers, ${currentJob.providers.length} providers in ${currentJob.data.duration}`
    )
  )

  if (currentJob.data.failed) {
    currentJob.log(chalk.red(`${currentJob.data.failed} failed`))
  }

  const result = await getRepository(Job).save(currentJob)

  return result
}
