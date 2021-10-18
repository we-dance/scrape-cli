import { getPage } from '../puppeteer/browser'
import { ScraperPlugin } from '../scraper'
import { getUrlContentId } from '../utils/url'

export const plugin: ScraperPlugin = {
  name: 'facebook.group',
  patterns: ['facebook.com/groups'],
  getList: async (url: string): Promise<any[]> => {
    const groupId = getUrlContentId(url)
    const groupUrl = `https://m.facebook.com/groups/${groupId}?view=events`

    const page = await getPage(groupUrl)

    const code = `[...document.querySelectorAll('#page a[href*=events]')].map(node => ({
      name: node.textContent,
      url: node.href,
      facebook: node.href,
    }))`

    return await page.evaluate(code)
  },
}
