export type CrawledPage = {
  site: string
  url: string
  title: string
  text: string
}

const SITE_COLORS = ['#1f77b4', '#17becf', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

export function hostOf(urlOrHost: string): string {
  try {
    const u = urlOrHost.includes('://')
      ? new URL(urlOrHost)
      : new URL(`https://${urlOrHost}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return urlOrHost
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/^www\./, '')
  }
}

export function colorForSites(sites: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  sites.forEach((s, i) => {
    map[s] = SITE_COLORS[i % SITE_COLORS.length]
  })
  return map
}

export async function collectSites(
  siteLines: string[],
  maxPages: number,
  _query: string,
  onProgress?: (msg: string) => void,
): Promise<CrawledPage[]> {
  const sites = siteLines.map((s) => s.trim()).filter(Boolean)
  if (sites.length === 0) throw new Error('Укажите хотя бы один сайт')

  onProgress?.('Скачивание страниц…')

  const res = await fetch('/api/crawl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sites, maxPages }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    pages?: CrawledPage[]
    error?: string
  }

  if (!res.ok) {
    throw new Error(data.error || `Ошибка crawl API (${res.status})`)
  }

  const pages = data.pages || []
  if (pages.length === 0) {
    throw new Error('Не удалось получить страницы. Проверьте URL и доступность сайтов.')
  }

  onProgress?.(`Скачано страниц: ${pages.length}`)
  return pages
}

export function chunkPage(text: string, maxWords = 55): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let buf = ''
  for (const s of sentences) {
    const next = buf ? `${buf} ${s}` : s
    if (next.split(/\s+/).length > maxWords && buf) {
      chunks.push(buf)
      buf = s
    } else buf = next
  }
  if (buf) chunks.push(buf)
  if (chunks.length === 0) chunks.push(text.slice(0, 400))
  return chunks
}
