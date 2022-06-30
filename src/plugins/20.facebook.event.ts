import { getPage } from '../puppeteer/browser'
import { ScraperPlugin } from '../scraper'
import { parse, add } from 'date-fns'
import config from '../config'

interface EventSchema {
  startDate: Date
  endDate?: Date
  category: string
  name: string
  tickets?: string
  url: string
  description?: string
  image?: string
  organisers?: [string]
  venue?: any
  debug?: any
}

export const plugin: ScraperPlugin = {
  name: 'facebook.event',
  contentType: 'text/html',
  patterns: ['facebook.com/events/', 'fb.me/e/', 'fb.com/events'],
  getItem: async (url: string): Promise<EventSchema | null> => {
    const page = await getPage(url)

    await page.evaluate(
      `document.querySelectorAll('div').forEach(d => { if (d.textContent === 'See more') { d.click() } })`
    )

    const code = `[...document.querySelectorAll('div[role=main]')].map(node => ({
      name: node.querySelectorAll('h2')[0].textContent,
      date: node.querySelectorAll('h2')[0].parentElement.parentElement.firstChild.textContent,
      description: node.querySelectorAll('h2')[1].parentElement.parentElement.parentElement.parentElement.childNodes[6].innerText,
      image: node.querySelectorAll('img')[1].src,
      organisers: [...node.querySelectorAll('[role=list]')[1].querySelectorAll('a')].map(a => a.href),
      tickets: node.querySelector('[aria-label="Find Tickets"]').href
    }))[0]`

    const raw = await page.evaluate(code)

    const mobileUrl = url.replace(
      'https://facebook.com',
      'https://m.facebook.com'
    )

    if (!raw.date) {
      throw new Error('Event date was not found')
    }

    const mobilePage = await getPage(mobileUrl)

    let addressUrl = await mobilePage.evaluate(
      `Array.prototype.slice.call(document.querySelectorAll('a[href]')).map(a => a.href).find(href => href.includes('here.com'))`
    )

    addressUrl = addressUrl.replace('https://lm.facebook.com/l.php?u=', '')
    addressUrl = decodeURIComponent(addressUrl)
    addressUrl = addressUrl.split('?')[0]

    const mapPage = await getPage(addressUrl)

    let venueName = await mapPage.evaluate(
      `document.querySelector('[class~=name]').textContent`
    )
    let venueAddress = await mapPage.evaluate(
      `document.querySelector('[class~=address]').textContent`
    )
    let coordinates = await mapPage.evaluate(
      `document.querySelector('[class~=coordinates] dd').textContent`
    )

    let [lat, lng] = coordinates.split(', ')

    let description = raw.description.replace(' See less', '')
    let category = description.split('\n').pop()

    let [date, timezone] = raw.date.split(' UTC')
    let rawStartDate
    let rawEndDate

    if (date.includes('–')) {
      ;[rawStartDate, rawEndDate] = date.split(' – ')
    } else {
      rawStartDate = date
    }

    rawStartDate = rawStartDate.replace(' AT ', ' ') + ' ' + timezone
    const now = new Date()

    let startDate = parse(rawStartDate, 'EEEE, MMMM d, yyyy h:mm a X', now)

    if (isNaN(startDate.getTime())) {
      startDate = parse(rawStartDate, 'MMMM d h:mm a X', now)
    }

    let endDate

    if (rawEndDate) {
      rawEndDate = rawEndDate + ' ' + timezone

      if (rawEndDate.includes('AT')) {
        rawEndDate = rawEndDate.replace(' AT ', ' ')
        endDate = parse(rawEndDate, 'MMMM d, h:mm a X', startDate)

        if (isNaN(endDate.getTime())) {
          endDate = parse(rawEndDate, 'MMMM d h:mm a X', startDate)
        }
      } else {
        endDate = parse(rawEndDate, 'h:mm a X', startDate)
      }
    }

    if (endDate) {
      if (endDate && endDate < startDate) {
        endDate = add(startDate, { days: 1 })
      }
    }

    let tickets = decodeURIComponent(
      raw.tickets.replace('https://l.facebook.com/l.php?u=', '')
    )

    const result: EventSchema = {
      description,
      startDate,
      endDate,
      category,
      name: raw.name,
      tickets,
      url,
      image: raw.image,
      organisers: raw.organisers,
      venue: {
        name: venueName,
        address: venueAddress,
        addressUrl: addressUrl,
        lat,
        lng,
      },
    }

    if (config.verbose > 2) {
      result.debug = {
        date,
        timezone,
        startDate: rawStartDate,
        endDate: rawEndDate,
      }
    }

    return result
  },
}
