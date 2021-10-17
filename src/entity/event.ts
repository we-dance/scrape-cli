import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'
import { currentJob } from './job'
import { Organiser } from './organiser'
import { getCleanUrl, getUrlContentId } from '../utils/url'

export class Event extends Entity {
  label?: string

  constructor(data: any, label?: string) {
    super()

    this.data = data
    this.label = label

    this.name = 'event'

    this.database = new FileDatabaseDriver(
      `${config.eventsDatabase}/events/${this.data.source}/${this.data.id}.yml`
    )

    this.uri = () => `${this.data.source} ${this.data.id} (${this.label})`

    this.beforeUpdate = (before: any, after: any) => {
      const result = after

      if (before?.image) {
        delete result.image
      }

      return result
    }

    this.afterSave = async () => {
      if (this.data.organiserFacebook) {
        const organiser = new Organiser({
          id: getUrlContentId(this.data.organiserFacebook),
        })
        await organiser.update({
          facebook: getCleanUrl(this.data.organiserFacebook),
          name: this.data.organiserName,
        })
      }
    }

    this.beforeSave = () => {
      if (!currentJob) {
        return
      }

      if (this.changed) {
        this.data.history = this.data.history || []
        this.data.history.push(currentJob.id)
        this.data.updatedByJob = currentJob.id

        if (!this.exists) {
          this.data.createdByJob = currentJob.id
        }
      }
    }
  }
}
