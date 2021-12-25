import { Entity } from '../orm'
import { currentJob } from './job'

export class Organiser extends Entity {
  collection = 'organisers'

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
