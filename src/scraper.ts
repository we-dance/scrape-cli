import axios from 'axios'
import * as glob from 'glob'
import { uniqBy } from 'lodash'
import { getPage } from './puppeteer/browser'
import { getUrlContentId, getUrlProvider, isFacebookEvent } from './utils/url'
import config from './config'
import { debug } from './lib'
import chalk = require('chalk')

interface NodeOptions {
  url: string
  mapping: { [field: string]: string }
  notFound?: string
  before?: string
}

export async function getPageNodes(options: NodeOptions) {
  const page = await getPage(options.url)

  async function getElementText(filteredSelector: string) {
    if (!filteredSelector) {
      return null
    }

    const [selector, ...filters] = filteredSelector.split('|')

    let filter: string
    let element

    filter = filters[0]

    if (filter && filter.includes('eq(')) {
      const eqNumber = Number(filter.replace('eq(', '').replace(')', ''))
      element = (await page.$$(selector))[eqNumber]

      filter = filters[1]
    }

    if (!element) {
      element = await page.$(selector)
    }

    if (!element) {
      return null
    }

    let innerText = await page.evaluate((e) => e.innerText, element)

    if (!filter) {
      return innerText
    }

    if (innerText) {
      innerText = innerText.trim()
    }

    if (filter.includes('trim(')) {
      const trimText = filter.replace('trim(', '').replace(')', '')

      return innerText.replace(trimText, '')
    }

    switch (filter) {
      case 'first':
        return innerText.replace(/(\n.*)/, '')
      case 'all':
        return await page.$$(selector)
      case 'json':
        return JSON.parse(innerText)
      case 'src':
        return await page.evaluate((e) => e?.getAttribute('src'), element)
      case 'bool':
        return !!innerText
      case 'content':
        return await page.evaluate(
          (e) =>
            e.getAttribute('content') ??
            e.querySelector('[content]')?.getAttribute('content'),
          element
        )
      case 'title':
        return await page.evaluate(
          (e) =>
            e.getAttribute('title') ??
            e.querySelector('[title]')?.getAttribute('title'),
          element
        )
      case 'href':
        return await page.evaluate(
          (e) =>
            e.getAttribute('href') ??
            e.querySelector('[href]')?.getAttribute('href'),
          element
        )
    }

    return null
  }

  async function getFields(mapping: any) {
    const result = {} as any

    for (const field of Object.keys(mapping)) {
      const selector = mapping[field]
      result[field] = await getElementText(selector)
    }

    return result
  }

  if (options.notFound) {
    const stopElement = await page.$(options.notFound)

    if (stopElement) {
      return null
    }
  }

  if (options.before) {
    await page.click(options.before)
  }

  const fields = await getFields(options.mapping)

  fields.url = page.url()

  return fields
}

const mapProvider = (parser: string) => {
  return (item: any) => {
    let facebook = null
    let organiserFacebook = item.organiserFacebook

    const id = item.id || getUrlContentId(item.url)
    const source = item.source || getUrlProvider(item.url)

    if (item.hasOffers) {
      item.tickets = item.url
    }

    delete item.hasOffers

    if (item.facebook) {
      if (!isFacebookEvent(item.facebook)) {
        organiserFacebook = item.facebook
      } else {
        facebook = item.facebook
      }
    }

    return {
      ...item,
      facebook,
      organiserFacebook,
      id,
      source,
      parser,
    }
  }
}

export interface ScraperPlugin {
  default?: boolean
  contentType?: string
  name: string
  patterns?: string[]
  getList?(url: string): Promise<any[]>
  getItem?(url: string): Promise<any>
}

async function getPlugins(
  url: string,
  contentType: string
): Promise<ScraperPlugin[]> {
  const plugins = await loadPlugins()
  const result = []

  for (const currentPlugin of plugins) {
    if (
      currentPlugin.contentType &&
      contentType.includes(currentPlugin.contentType) &&
      (currentPlugin.patterns
        ? currentPlugin.patterns.some((pattern) => url.includes(pattern))
        : true)
    ) {
      result.push(currentPlugin)
    }
  }

  return result
}

export async function loadPlugins(): Promise<ScraperPlugin[]> {
  return new Promise((resolve, reject) => {
    glob(__dirname + '/plugins/*.js', function (err, res) {
      if (err) {
        reject(err)
      } else {
        Promise.all(
          res.map((file) => {
            return import(file.replace(__dirname, '.').replace('.js', ''))
          })
        ).then((modules) => {
          resolve(modules.map((m) => m.plugin))
        })
      }
    })
  })
}

type ParseMode = 'mixed' | 'list' | 'item'

export async function parse(url: string, mode: ParseMode = 'mixed') {
  let allItems = []
  let scrapers = []
  let errors = []

  const res = await axios.head(url)

  const plugins = await getPlugins(url, res.headers['content-type'])

  for (const plugin of plugins) {
    let items = []

    if (mode !== 'item' && plugin.getList) {
      if (config.verbose > 2) {
        debug(chalk.gray(`request via ${plugin.name}:list`))
      }

      try {
        items = await plugin.getList(url)
        items = uniqBy(items, 'url')
        items = items.map(mapProvider(plugin.name))
      } catch (e) {
        items = []
        errors.push({
          plugin: `${plugin.name}:list`,
          error: (e as any)?.message,
        })
      }
    }
    if (mode !== 'list' && plugin.getItem) {
      if (config.verbose > 2) {
        debug(chalk.gray(`request via ${plugin.name}:item`))
      }

      let item

      try {
        item = await plugin.getItem(url)

        if (item?.startDate) {
          item = mapProvider(plugin.name)(item)

          items = [item]
        }
      } catch (e) {
        items = []

        errors.push({
          plugin: `${plugin.name}:item`,
          error: (e as any)?.message,
        })
      }
    }

    if (!items) {
      continue
    }

    scrapers.push(plugin.name)
    allItems.push(...items)
  }

  if (!allItems.length) {
    let errorLine = ''

    for (const e of errors) {
      errorLine += `${e.plugin}: ${e.error}\n`
    }

    throw new Error(`No result with ${scrapers.join(', ')}\n${errorLine}`)
  }

  const result = {} as any

  result.id = getUrlProvider(url)
  result.url = url
  result.items = allItems
  result.count = allItems.length
  result.scrapers = scrapers

  return result
}
