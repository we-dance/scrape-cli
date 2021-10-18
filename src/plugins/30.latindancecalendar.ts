import { getPage } from '../puppeteer/browser'
import { getPageNodes, ScraperPlugin } from '../scraper'

export const plugin: ScraperPlugin = {
  name: 'latindancecalendar',
  patterns: ['latindancecalendar.com'],
  getList: async (url: string): Promise<any[]> => {
    const page = await getPage(url)

    const code = `[...document.querySelectorAll(".event_table")].map(node => ({
      name: node.querySelector('.link').textContent,
      url: node.querySelector('.link').href,
      facebook: node.querySelectorAll('td')[3].querySelector('.quicklink')?.href || '',
      website: node.querySelectorAll('td')[4].querySelector('.quicklink')?.href || '',
    }))`

    return await page.evaluate(code)
  },
  getItem: async (url: string) => {
    const result = await getPageNodes({
      url,
      mapping: {
        name: '.page-title',
        description: '.see_more',
        cover: '.vevent img|src',
        address: '.location',
        website: '.outbound.website|href',
        facebook: '.event_link|href',
        startDate: '.value-title|title',
      },
    })

    return result
  },
}
