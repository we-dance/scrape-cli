import * as chalk from 'chalk'
import * as _ from 'lodash'
import { Audit } from 'entity-diff'
import { readFile } from './utils/filesystem'
import save from './exporters/yaml'
import { debug } from '../lib'

const audit = new Audit()

export interface DatabaseDriver {
  read(entity: any): any
  write(entity: any): any
}

export interface BeforeUpdateHandler {
  (before: any, after: any): any
}

export interface EntityUri {
  (): string
}

export class FileDatabaseDriver implements DatabaseDriver {
  path: string

  constructor(path: string) {
    if (!path) {
      throw new Error('FileDatabaseDriver: path is not defined')
    }

    this.path = path
  }

  read() {
    return readFile(this.path)
  }

  async write(entity: any) {
    await save(this.path, entity)

    return entity
  }
}

export class Entity {
  name?: string
  uri?: EntityUri
  database?: DatabaseDriver
  beforeUpdate?: BeforeUpdateHandler
  data: any
  old: any
  diff: any
  exists: boolean
  changed: boolean

  constructor() {
    this.exists = false
    this.changed = false
    this.diff = []
  }

  load() {
    if (!this.database) {
      throw new Error('Entity: database driver is missing')
    }

    if (this.data) {
      this.data = this.database?.read(this.data)

      if (this.data) {
        this.exists = true
      }
    }

    return this
  }

  async update(data: any) {
    this.load()

    this.old = { ...this.data }

    let cleanData = _.pickBy(data, _.identity)

    if (this.beforeUpdate) {
      cleanData = this.beforeUpdate(this.old, cleanData)

      if (!cleanData) {
        return
      }
    }

    await this.save({
      ...this.data,
      ...cleanData,
    })

    return this
  }

  async save(data: any) {
    if (!this.uri) {
      throw new Error('Entity: uri method is missing')
    }
    if (!this.database) {
      throw new Error('Entity: database driver is missing')
    }
    if (!data) {
      return
    }

    this.data = data

    if (this.old) {
      this.diff = audit.diff(this.old, this.data)
      this.changed = this.diff.length > 0
    } else {
      this.changed = true
    }

    if (this.changed) {
      this.data.updatedAt = new Date()

      if (!this.exists) {
        this.data.createdAt = new Date()
      }

      await this.database?.write(this.data)

      if (this.exists) {
        const changes = this.diff.map((field: any) => field.key)
        debug(
          chalk.blue(`U ${this.name} ${this.uri()}`),
          chalk.yellow(changes.join(', '))
        )
      } else {
        debug(chalk.green(`A ${this.name} ${this.uri()}`))
      }
    } else {
      debug(chalk.gray(`S ${this.name} ${this.uri()}`))
    }

    return this
  }
}
