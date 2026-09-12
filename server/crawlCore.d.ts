export function crawlSites(opts: {
  sites: string[]
  maxPages?: number
  onProgress?: (msg: string) => void
}): Promise<Array<{ site: string; url: string; title: string; text: string }>>

export function hostOf(urlOrHost: string): string
