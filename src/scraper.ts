import { getPage } from './puppeteer/browser'
import { uniqBy } from 'lodash'
import { getUrlContentId, getUrlProvider, isFacebookEvent } from './utils/url'

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
      case 'json':
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

const mapProvider = (item: any) => {
  let facebook = null
  let organiserFacebook = null

  const id = getUrlContentId(item.url)
  const source = getUrlProvider(item.url)

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
  }
}

interface ScraperPlugin {
  default?: boolean
  name: string
  patterns: string[]
  items: string
  map?(item: any): any
  getUrl?(url: string): any
}

const schemaPlugin: ScraperPlugin = {
  default: true,
  name: 'schema',
  patterns: ['goandance.com'],
  items: `[...document.querySelectorAll('[itemtype="http://schema.org/Event"]')].map(node => ({
    name: node.querySelector('[itemprop="name"]').textContent?.trim(),
    image: node.querySelector('[itemprop="image"]').src,
    startDate: node.querySelector('[itemprop="startDate"]').content,
    endDate: node.querySelector('[itemprop="endDate"]').content,
    url: node.querySelector('[itemprop="url"]').content,
    addressStreet: node.querySelector('[itemprop="location"] [itemprop="streetAddress"]').textContent,
    addressLocality: node.querySelector('[itemprop="location"] [itemprop="addressLocality"]').textContent,
    addressRegion: node.querySelector('[itemprop="location"] [itemprop="addressRegion"]').textContent,
    addressCountry: node.querySelector('[itemprop="location"] [itemprop="addressCountry"]').textContent,
    venue: node.querySelector('[itemprop="location"]').querySelector('[itemprop="name"]').textContent,
  }))`,
}

const latindancecalendarPlugin: ScraperPlugin = {
  name: 'latindancecalendar.com',
  patterns: ['latindancecalendar.com'],
  items: `[...document.querySelectorAll(".event_table")].map(node => ({
    name: node.querySelector('.link').textContent,
    url: node.querySelector('.link').href,
    facebook: node.querySelectorAll('td')[3].querySelector('.quicklink')?.href || '',
    website: node.querySelectorAll('td')[4].querySelector('.quicklink')?.href || '',
  }))`,
}

const facebookGroupPlugin: ScraperPlugin = {
  name: 'facebook.group',
  patterns: ['facebook.com/groups'],
  items: `[...document.querySelectorAll('#page a[href*=events]')].map(node => ({
    name: node.textContent,
    url: node.href,
    facebook: node.href,
  }))`,
  getUrl: (url) => {
    const groupId = getUrlContentId(url)
    return `https://m.facebook.com/groups/${groupId}?view=events`
  },
}

const facebookPagePlugin: ScraperPlugin = {
  name: 'facebook.page',
  patterns: ['facebook.com'],
  items: `[...document.querySelectorAll('#page a[href*=events]')].map(node => ({
    name: node.textContent,
    url: node.href,
    facebook: node.href,
  }))`,
  getUrl: (url) => {
    const pageId = getUrlContentId(url)
    return `https://m.facebook.com/${pageId}/events`
  },
}

const plugins = [
  schemaPlugin,
  latindancecalendarPlugin,
  facebookGroupPlugin,
  facebookPagePlugin,
]

function getPlugin(url: string): ScraperPlugin {
  let result = null

  for (const plugin of plugins) {
    if (plugin.patterns.some((pattern) => url.includes(pattern))) {
      result = plugin
      break
    }
  }

  if (!result) {
    result = plugins.find((p) => p.default)
  }

  if (!result) {
    throw new Error('No default ScraperPlugin')
  }

  if (!result.getUrl) {
    result.getUrl = (url) => url
  }

  return result
}

export async function getEventList(url: string) {
  const result = {} as any

  result.id = getUrlProvider(url)
  result.url = url

  const plugin = getPlugin(url)

  if (typeof plugin.getUrl !== 'function') {
    throw new Error('getUrl is not defined')
  }

  const page = await getPage(plugin.getUrl(url))
  let items = await page.evaluate(plugin.items)

  items = uniqBy(items, 'url')

  items = items.map(mapProvider)
  if (typeof plugin?.map === 'function') {
    items = items.map(plugin.map)
  }

  result.items = items
  result.count = items.length

  return result
}
