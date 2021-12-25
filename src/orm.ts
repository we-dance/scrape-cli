import * as chalk from 'chalk'
import * as _ from 'lodash'
import { debug } from './lib'
import { Audit } from 'entity-diff'
import config from './config'
import { readFile } from './utils/filesystem'
import save from './exporters/yaml'

export interface DatabaseDriver {
  read(entity: any): any
  write(entity: any): any
}

export interface BeforeUpdateHandler {
  (before: any, after: any): any
}

export interface AfterSaveHandler {
  (): Promise<void>
}
export interface BeforeSaveHandler {
  (): void
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
  collection?: string
  beforeUpdate?: BeforeUpdateHandler
  beforeDiff?: BeforeSaveHandler
  beforeSave?: BeforeSaveHandler
  afterSave?: AfterSaveHandler
  data?: any
  old: any
  diff: any
  exists: boolean
  changed: boolean

  constructor(data?: any) {
    this.exists = false
    this.changed = false
    this.diff = []
    this.data = data || {}
  }
}

const audit = new Audit()

function getDatabase(query: any) {
  let uri = `${query.collection}/${query.id}`

  if (query.collection === 'events') {
    uri = `${query.collection}/${query.source}/${query.id}`
  }

  const documentPath = `${config.eventsDatabase}/${uri}.yml`

  return new FileDatabaseDriver(documentPath)
}

class Repository {
  TheEntity: typeof Entity

  constructor(TheEntity: typeof Entity) {
    this.TheEntity = TheEntity
  }

  async findOne(params: any): Promise<Entity> {
    let query

    if (typeof params === 'object') {
      query = params
    } else {
      query = {
        id: params,
      }
    }

    const entity = new this.TheEntity()
    query.collection = entity.collection

    const database = getDatabase(query)
    entity.data = await database.read()

    if (entity.data) {
      entity.exists = true
    }

    return entity
  }

  async update(id: any, data: any) {
    const entity = await this.findOne(id)

    entity.old = { ...entity.data }

    let cleanData = _.pickBy(data, _.identity)

    if (entity.beforeUpdate) {
      cleanData = entity.beforeUpdate(entity.old, cleanData)

      if (!cleanData) {
        return
      }
    }

    entity.data = {
      ...entity.data,
      ...cleanData,
    }

    return await this.save(entity)
  }

  async save(entity: Entity) {
    const uri = `${entity.collection}/${entity.data.id}`
    const database = getDatabase({
      ...entity.data,
      collection: entity.collection,
    })

    if (entity.beforeDiff) {
      entity.beforeDiff()
    }

    if (entity.exists) {
      entity.diff = audit.diff(entity.old, entity.data)
      entity.changed = entity.diff.length > 0
    } else {
      entity.changed = true
    }

    if (entity.beforeSave) {
      entity.beforeSave()
    }

    if (entity.changed) {
      entity.data.updatedAt = new Date()

      if (!entity.exists) {
        entity.data.createdAt = new Date()
      }

      await database.write(entity.data)

      if (entity.exists) {
        const changes = entity.diff.map((field: any) => field.key)

        debug(chalk.blue(`U ${uri}`), chalk.yellow(changes.join(', ')))

        for (const change of entity.diff) {
          debug(chalk.gray(`${change.key}: ${change.from} -> ${change.to}`))
        }
      } else {
        debug(chalk.green(`A ${uri}`))
      }

      if (entity.afterSave) {
        await entity.afterSave()
      }
    } else {
      debug(chalk.gray(`S ${uri}`))
    }
  }
}

export function getRepository(TheEntity: any): any {
  return new Repository(TheEntity)
}
