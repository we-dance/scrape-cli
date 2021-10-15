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

  const providerId = getUrlContentId(item.providerUrl)
  const provider = getUrlProvider(item.providerUrl)

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
    provider,
    providerId,
    addedAt: new Date(),
  }
}

interface ScraperPlugin {
  name: string
  urls: string[]
  items: string
  map?: (item: any) => any
}

// const plugin1: ScraperPlugin = {
//   name: 'latindancecalendar.com',
//   urls: ['latindancecalendar.com'],
//   items: `[...document.querySelectorAll(".event_table")].map(node => ({
//     name: node.querySelector('.link').textContent,
//     providerUrl: node.querySelector('.link').href,
//     facebook: node.querySelectorAll('td')[3].querySelector('.quicklink')?.href || '',
//     website: node.querySelectorAll('td')[4].querySelector('.quicklink')?.href || '',
//   }))`,
// }

const plugin2: ScraperPlugin = {
  name: 'goandance.com',
  urls: ['goandance.com'],
  items: `[...document.querySelectorAll('[itemtype="http://schema.org/Event"]')].map(node => ({
    name: node.querySelector('[itemprop="name"]').textContent?.trim(),
    image: node.querySelector('[itemprop="image"]').src,
    startDate: node.querySelector('[itemprop="startDate"]').content,
    endDate: node.querySelector('[itemprop="endDate"]').content,
    providerUrl: node.querySelector('[itemprop="url"]').content,
    locality: node.querySelector('[itemprop="location"]').querySelector('.state').textContent,
    venue: node.querySelector('[itemprop="location"]').querySelector('[itemprop="name"]').textContent,
  }))`,
}

export async function getEventList(url: string) {
  const page = await getPage(url)

  const result = {} as any

  result.id = getUrlProvider(url)
  result.url = url

  const plugin = plugin2

  let items = await page.evaluate(plugin.items)

  items = uniqBy(items, 'providerUrl')

  items = items.map(mapProvider)
  if (typeof plugin?.map === 'function') {
    items = items.map(plugin.map)
  }

  result.items = items
  result.count = items.length

  return result
}
