import { Entity, FileDatabaseDriver } from '../database'
import config from '../../config'

export class Event extends Entity {
  constructor(data: any) {
    super()

    this.data = data

    this.name = 'event'

    this.database = new FileDatabaseDriver(
      `${config.eventsPath}/${this.data.provider}/${this.data.providerId}.yml`
    )

    this.uri = () => `${this.data.provider} ${this.data.providerId}`

    this.beforeUpdate = (before: any, after: any) => {
      const result = after

      if (before?.image) {
        delete result.image
      }

      return result
    }
  }
}
