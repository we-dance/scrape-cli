import * as chalk from 'chalk'
import * as _ from 'lodash'
import { Audit } from 'entity-diff'
import { debug } from '../lib'
import config from '../config'
import { FileRef } from './ref-file'
import { SupabaseRef } from './ref-supabase'
import { FirebaseRef } from './ref-firebase'

export interface IQuery {
  collection: string
  id?: string
  value?: any
  where?: {
    [key: string]: any
  }
}

export interface IDocRef {
  get(query: IQuery): any
  set(query: IQuery): any
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

export class Entity {
  collection: string
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
    this.collection = ''
    this.exists = false
    this.changed = false
    this.diff = []
    this.data = data || {}
  }
}

const audit = new Audit()

export function getDocRef(driver = config.databaseDriver) {
  switch (driver) {
    case 'supabase':
      return new SupabaseRef()
    case 'firebase':
      return new FirebaseRef()
    default:
      return new FileRef()
  }
}

class Repository {
  TheEntity: typeof Entity

  constructor(TheEntity: typeof Entity) {
    this.TheEntity = TheEntity
  }

  async find(params: any): Promise<Entity[]> {
    let result = []

    const entity = new this.TheEntity()
    params.collection = entity.collection

    const docs = await getDocRef().get(params)

    if (!docs) {
      return []
    }

    for (const doc of docs) {
      const event = new this.TheEntity(doc)
      event.exists = true

      result.push(event)
    }

    return result
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

    query.id = `${query.id}`

    const entity = new this.TheEntity()
    query.collection = entity.collection

    entity.data = await getDocRef().get(query)

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

      await getDocRef().set({
        collection: entity.collection,
        id: `${entity.data.id}`,
        value: entity.data,
      })

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
