export function normalizeUrl(input: string): string {
  let url = input.trim()
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url
  }
  // Remove trailing slash
  url = url.replace(/\/+$/, '')
  return url
}

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(normalizeUrl(input))
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.')
  } catch {
    return false
  }
}

export function getHostname(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname
  } catch {
    return url
  }
}

export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}
