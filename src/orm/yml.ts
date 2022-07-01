import { readFile, readFiles } from '../utils/filesystem'
import { IDocRef, IQuery } from './orm'
import save from '../exporters/yaml'
import config from '../config'

export class FileRef implements IDocRef {
  getPath(query: any) {
    if (query.id) {
      const uri = `${query.collection}/${query.id}`

      return `${config.eventsDatabase}/${uri}.yml`
    }

    return `${config.eventsDatabase}/${query.collection}/`
  }

  get(query: IQuery) {
    if (query.id) {
      const path = this.getPath(query)

      return readFile(path)
    }

    if (query.where) {
      const path = this.getPath(query)

      console.log('[orm] query.where is not supported yet')

      return readFiles(path)
    }
  }

  async set(query: IQuery) {
    const path = this.getPath(query)
    await save(path, query.value)

    return query.value
  }
}
