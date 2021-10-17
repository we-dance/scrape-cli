import * as _progress from 'cli-progress'
import * as chalk from 'chalk'
import * as moment from 'moment'
import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'

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
  data: JobData

  constructor(provider: string, action: string, url?: string) {
    super()

    this.name = 'job'

    this.data = {
      id: Date.now(),
      provider,
      action,
      startedAt: new Date(),
      urls: [],
      logs: [],
    }
    this.id = this.data.id.toString()

    this.database = new FileDatabaseDriver(
      `${config.eventsDatabase}/jobs/${this.id}.yml`
    )

    this.uri = () => `${this.data.id}`

    currentJob = this

    if (url) {
      this.data.urls?.push(url)
    }

    if (!config.verbose) {
      progress = multibar.create(0, 0, {
        title: `${action} ${provider}`,
      })
    } else {
      this.log()
      this.log(chalk.green(action), provider)
    }
  }

  log(...args: any[]) {
    if (config.verbose) {
      console.log(...args)
    }

    if (args.length > 0) {
      this.data.logs?.push(args.join(' '))
    }
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

    if (config.verbose) {
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

  async finish(
    status: string,
    total: number,
    processed: number,
    failed: number
  ) {
    if (progress) {
      progress.setTotal(total)
      progress.update(processed, { name: status })
    }

    this.data.finishedAt = new Date()
    this.data.total = total
    this.data.status = status
    this.data.processed = processed
    this.data.failed = failed

    const time = this.data.finishedAt.getTime() - this.data.startedAt.getTime()
    const seconds = moment.duration(time).seconds()
    const minutes = moment.duration(time).minutes()

    this.data.duration = `${minutes}m ${seconds}s`

    await this.save(this.data)

    this.log()
    this.log(
      chalk.green(
        `🎉 ${this.data.status} with ${this.data.total} results in ${this.data.duration}`
      )
    )

    if (this.data.failed) {
      this.log(chalk.red(`${this.data.failed} failed`))
    }
  }
}
