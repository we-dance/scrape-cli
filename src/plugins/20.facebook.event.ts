import { getPage } from '../puppeteer/browser'
import { ScraperPlugin } from '../scraper'
import { parse, add } from 'date-fns'

export const plugin: ScraperPlugin = {
  name: 'facebook.event',
  contentType: 'text/html',
  patterns: ['facebook.com/events/', 'fb.me/e/', 'fb.com/events'],
  getItem: async (url: string) => {
    const page = await getPage(url)

    await page.evaluate(
      `document.querySelectorAll('div').forEach(d => { if (d.textContent === 'See more') { d.click() } })`
    )

    const code = `[...document.querySelectorAll('div[role=main]')].map(node => ({
      name: node.querySelectorAll('h2')[0].textContent,
      date: node.querySelectorAll('h2')[0].parentElement.parentElement.firstChild.textContent,
      description: node.querySelectorAll('h2')[1].parentElement.parentElement.parentElement.parentElement.childNodes[6].innerText,
      image: node.querySelectorAll('img')[1].src,
      organisers: [...node.querySelectorAll('h2')[2].parentElement.parentElement.parentElement.parentElement.querySelectorAll('a')].map(a => a.href),
      tickets: [...node.querySelectorAll('h2')[3].parentElement.parentElement.parentElement.parentElement.querySelectorAll('a')].map(a => a.href)[0]
    }))[0]`

    const result = await page.evaluate(code)

    if (!result) {
      return null
    }

    result.description = result.description.replace(' See less', '')

    if (result.date) {
      let [date, timezone] = result.date.split(' UTC')
      let startDate
      let endDate

      if (date.includes('–')) {
        ;[startDate, endDate] = date.split(' – ')
      } else {
        startDate = date
      }

      startDate = startDate.replace(' AT ', ' ') + ' ' + timezone

      result.startDate = parse(startDate, 'EEEE, MMMM d, yyyy h:mm a X', 0)

      if (endDate) {
        endDate = endDate + ' ' + timezone

        if (endDate.includes('AT')) {
          endDate = endDate.replace(' AT ', ' ')
          result.endDate = parse(endDate, 'MMMM d, h:mm a X', result.startDate)
        } else {
          result.endDate = parse(endDate, 'h:mm a X', result.startDate)
        }
      }

      if (result.endDate && result.endDate < result.startDate) {
        result.endDate = add(result.endDate, { days: 1 })
      }
    }

    delete result.date

    return result
  },
}
