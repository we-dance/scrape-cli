export function getCleanUrl(url?: string): string {
  if (!url) {
    throw new Error('getCleanUrl: no url')
  }

  const result = url.replace(/(\?.*)/, '').replace(/\/?$/, '')

  return result
}

export function getUrlContentId(url?: string): string {
  if (!url) {
    throw new Error('getUrlContentId: no url')
  }

  const result = url
    .replace(/(\?.*)/, '')
    .replace(/\/$/, '')
    .split('/')
    .pop()

  if (!result) {
    throw new Error('Invalid url')
  }

  return result
}

export function getUrlProvider(url?: string): string {
  if (!url) {
    throw new Error('getUrlProvider: no url')
  }

  return url
    .split('/')[2]
    .replace(/^www\./, '')
    .replace(/^m\./, '')
}

export function isShort(url?: string): boolean {
  if (!url) {
    return false
  }

  return ['fb.me', 'bit.ly'].some((word) => url.includes(word))
}

export function isFacebookEvent(url?: string): boolean {
  if (!url) {
    return false
  }

  return ['facebook.com/events/', 'fb.me/e/', 'fb.com/events'].some((word) =>
    url.includes(word)
  )
}

export function getUrlParam(url: string, param: string) {
  const match = RegExp('[?&]' + param + '=([^&]*)').exec(url)
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '))
}
