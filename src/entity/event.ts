import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'
import { currentJob } from './job'

export class Event extends Entity {
  constructor(data: any) {
    super()

    this.data = data
    this.id = this.data.id

    this.name = 'event'

    this.database = new FileDatabaseDriver(
      `${config.eventsPath}/${this.data.source}/${this.data.id}.yml`
    )

    this.uri = () => `${this.data.source} ${this.data.id}`

    this.beforeUpdate = (before: any, after: any) => {
      const result = after

      if (before?.image) {
        delete result.image
      }

      return result
    }

    this.beforeSave = () => {
      if (!currentJob) {
        return
      }

      if (this.changed) {
        this.data.history = this.data.history || []
        this.data.history.push(currentJob.id)
        this.data.changedByJob = currentJob.id

        if (!this.exists) {
          this.data.createdByJob = currentJob.id
          //   this.data.provider = currentJob.provider
          //   this.data.providerId = currentJob.providerId
          //   this.data.providerUrl = currentJob.providerUrl
        }
      }
    }
  }
}
