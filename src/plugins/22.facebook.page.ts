import { getPage } from '../puppeteer/browser'
import { ScraperPlugin } from '../scraper'
import { getUrlContentId } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'facebook.page',
  contentType: 'text/html',
  patterns: ['facebook.com'],
  getList: async (url: string): Promise<any[]> => {
    const pageId = getUrlContentId(url)
    const pageUrl = `https://m.facebook.com/${pageId}/events`

    const page = await getPage(pageUrl)

    const code = `[...document.querySelectorAll('#page a[href*=events]')].map(node => ({
      name: node.textContent,
      url: node.href,
      facebook: node.href,
    }))`

    return await page.evaluate(code)
  },
}
