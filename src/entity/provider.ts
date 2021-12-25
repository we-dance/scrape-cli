import { Entity } from '../orm/orm'
import { currentJob } from './job'

export class Provider extends Entity {
  collection = 'providers'

  beforeSave = () => {
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
