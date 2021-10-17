import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'
import { currentJob } from './job'

export class Provider extends Entity {
  constructor(data: any) {
    super()

    this.data = data
    this.id = this.data.id

    this.name = 'provider'

    this.database = new FileDatabaseDriver(
      `${config.providersPath}/${this.id}.yml`
    )

    this.uri = () => `${this.data.id}`

    this.beforeSave = () => {
      if (!currentJob) {
        return
      }

      this.changed = true

      if (this.changed) {
        this.data.history = this.data.history || []
        this.data.history.push(currentJob.data.id)
        this.data.changedByJob = currentJob.data.id

        if (!this.exists) {
          this.data.createdByJob = currentJob.data.id
        }
      }
    }
  }
}
