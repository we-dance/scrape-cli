export function getCleanUrl(url: string): string {
  const result = url.replace(/(\?.*)/, '').replace(/\/?$/, '')

  return result
}

export function getUrlContentId(url: string): string {
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

export function getUrlProvider(url: string): string {
  return url
    .split('/')[2]
    .replace(/^www\./, '')
    .replace(/^m\./, '')
}

export function isShort(url: string): boolean {
  return ['fb.me', 'bit.ly'].some((word) => url.includes(word))
}

export function isFacebookEvent(url: string): boolean {
  return ['facebook.com/events/', 'fb.me/e/', 'fb.com/events'].some((word) =>
    url.includes(word)
  )
}
