import * as puppeteer from 'puppeteer'

async function getBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

interface NodeOptions {
  url: string
  mapping: { [field: string]: string }
  notFound?: string
  before?: string
}

export async function getPageNodes(options: NodeOptions) {
  const browser = await getBrowser()
  const page = await browser.newPage()

  async function getElementText(filteredSelector: string) {
    const [selector, ...filters] = filteredSelector.split('|')

    let filter
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
      case 'src':
        return await page.evaluate((e) => e.getAttribute('src'), element)
      case 'first':
        return innerText.replace(/(\n.*)/, '')
      case 'all':
        return await page.$$(selector)
      case 'content':
        return await page.evaluate(
          (e) =>
            e.getAttribute('content') ??
            e.querySelector('[content]').getAttribute('content'),
          element
        )
      case 'href':
        return await page.evaluate(
          (e) =>
            e.getAttribute('href') ??
            e.querySelector('[href]').getAttribute('href'),
          element
        )
      case 'json':
        return JSON.parse(innerText)
    }
  }

  async function getFields(mapping: any) {
    const result = {} as any

    for (const field of Object.keys(mapping)) {
      const selector = mapping[field]
      result[field] = await getElementText(selector)
    }

    return result
  }

  await page.goto(options.url, { waitUntil: 'networkidle0' })

  if (options.notFound) {
    const stopElement = await page.$(options.notFound)

    if (stopElement) {
      await browser.close()

      throw new Error('Not Found')
    }
  }

  if (options.before) {
    await page.click(options.before)
  }

  const fields = await getFields(options.mapping)

  await browser.close()

  return fields
}

export async function getEvent(id: string) {
  const result = await getPageNodes({
    url: `https://www.facebook.com/events/${id}`,
    before: '[data-testid="cookie-policy-dialog-accept-button"]',
    notFound: '',
    mapping: {
      name: '[data-testid=event-permalink-event-name]',
      description: '._63ew',
      cover: '#event_header_primary img|src',
      hostLink: '#title_subtitle a|href',
      hostName: '#title_subtitle a',
      date: '.uiGrid td|eq(1)|content',
      address: '.uiGrid td|eq(3)|trim(\nShow Map)',
      tickets: '.uiGrid td|eq(5)|href',
      meta: 'script[type="application/ld+json"]|json',
    },
  })

  result.startDate = null
  result.endDate = null

  if (result.date) {
    const [startDate, endDate] = result.date.split(' to ')

    result.startDate = startDate
    result.endDate = endDate
  }

  delete result.date

  result.online = false

  if (result.address === 'Online Event') {
    result.online = true
  }

  return result
}
