import { readFile } from '../utils/filesystem'
import { IDocRef, IQuery } from './orm'
import save from '../exporters/yaml'
import config from '../config'

export class FileRef implements IDocRef {
  getPath(query: any) {
    let uri = `${query.collection}/${query.id}`

    if (query.collection === 'events') {
      uri = `${query.collection}/${query.source}/${query.id}`
    }

    return `${config.eventsDatabase}/${uri}.yml`
  }

  get(query: IQuery) {
    const path = this.getPath(query)

    return readFile(path)
  }

  async set(query: IQuery) {
    const path = this.getPath(query)
    await save(path, query.value)

    return query.value
  }
}
