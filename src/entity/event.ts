import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'
import { currentJob } from './job'
import { getCleanUrl, getUrlContentId } from '../utils/url'

export class Event extends Entity {
  label?: string

  constructor(data: any, label?: string) {
    super()

    this.data = data
    this.label = label
    this.id = data.id

    this.name = 'event'

    this.database = new FileDatabaseDriver(
      `${config.eventsDatabase}/events/${this.data.source}/${this.data.id}.yml`
    )

    this.uri = () =>
      `${this.data.source} ${this.data.id}` +
      (this.label ? ` (${this.label})` : '')

    this.beforeUpdate = (before: any, after: any) => {
      const result = after

      if (before?.image) {
        delete result.image
      }

      return result
    }

    this.afterSave = async () => {
      if (!currentJob) {
        return
      }

      if (this.data.organiserFacebook) {
        currentJob.addOrganiser({
          id: getUrlContentId(this.data.organiserFacebook),
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
