import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'
import { currentJob } from './job'

export class Organiser extends Entity {
  constructor(data: any) {
    super()

    this.data = data
    this.id = data.id

    this.name = 'organiser'

    this.database = new FileDatabaseDriver(
      `${config.eventsDatabase}/organisers/${this.id}.yml`
    )

    this.uri = () => `${this.id}`

    this.beforeSave = () => {
      if (!currentJob) {
        return
      }

      if (this.changed) {
        this.data.history = this.data.history || []
        this.data.history.push(currentJob.data.id)
        this.data.updatedByJob = currentJob.data.id

        if (!this.exists) {
          this.data.createdByJob = currentJob.data.id
        }
      }
    }
  }
}
