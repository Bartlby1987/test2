/**
 * Server-side site crawler (Node). Used by /api/crawl and Vite middleware.
 */

const UA =
  'Mozilla/5.0 (compatible; RelevanceMapBot/1.0; +https://github.com/Bartlby1987/test2)'

function hostOf(urlOrHost) {
  try {
    const u = urlOrHost.includes('://')
      ? new URL(urlOrHost)
      : new URL(`https://${urlOrHost}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return String(urlOrHost)
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/^www\./, '')
  }
}

function startUrl(urlOrHost) {
  try {
    if (urlOrHost.includes('://')) return new URL(urlOrHost).origin + '/'
    return `https://${urlOrHost.replace(/\/$/, '')}/`
  } catch {
    return `https://${hostOf(urlOrHost)}/`
  }
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return ''
  return decodeEntities(m[1].replace(/\s+/g, ' ').trim()).slice(0, 200)
}

function htmlToText(html) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(cleaned)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000)
}

function extractLinks(html, baseUrl) {
  const base = new URL(baseUrl)
  const host = base.hostname.replace(/^www\./, '')
  const out = new Set()
  const re = /href\s*=\s*["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html))) {
    const raw = m[1].trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) {
      continue
    }
    try {
      const abs = new URL(raw, base)
      if (!/^https?:$/i.test(abs.protocol)) continue
      if (abs.hostname.replace(/^www\./, '') !== host) continue
      abs.hash = ''
      // drop common junk
      const path = abs.pathname.toLowerCase()
      if (/\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|mp4|mp3|css|js|xml|ico)$/i.test(path)) {
        continue
      }
      out.add(abs.toString().replace(/\/$/, '') || abs.origin)
    } catch {
      /* ignore */
    }
  }
  return [...out]
}

async function fetchHtml(url, timeoutMs = 10000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ctype = res.headers.get('content-type') || ''
    if (ctype && !/text\/html|application\/xhtml/i.test(ctype) && !ctype.includes('text/plain')) {
      throw new Error(`Not HTML: ${ctype}`)
    }
    const buf = await res.arrayBuffer()
    const slice = buf.byteLength > 1_500_000 ? buf.slice(0, 1_500_000) : buf
    return new TextDecoder('utf-8', { fatal: false }).decode(slice)
  } finally {
    clearTimeout(t)
  }
}

async function crawlOneSite(siteInput, maxPages, onProgress) {
  const site = hostOf(siteInput)
  const origin = startUrl(siteInput)
  const queue = [origin]
  const seen = new Set()
  const pages = []
  const limit = Math.max(1, Math.min(Number(maxPages) || 10, 40))

  while (queue.length && pages.length < limit) {
    const url = queue.shift()
    const key = url.replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)

    onProgress?.(`Сбор: ${site} (${pages.length + 1}/${limit})…`)
    try {
      const html = await fetchHtml(url)
      const title = extractTitle(html) || url
      const text = htmlToText(html)
      if (text.length < 40) continue

      pages.push({
        site,
        url: url.endsWith('/') && url !== origin ? url.slice(0, -1) : url,
        title,
        text: `${title}. ${text}`.slice(0, 14000),
      })

      if (pages.length < limit) {
        for (const link of extractLinks(html, url)) {
          const k = link.replace(/\/$/, '')
          if (!seen.has(k)) queue.push(link)
        }
      }
    } catch {
      // skip failed URL
    }
  }

  if (pages.length === 0) {
    throw new Error(`Не удалось скачать страницы с ${site}`)
  }
  return pages
}

/**
 * @param {{ sites: string[], maxPages?: number, onProgress?: (s: string) => void }} opts
 */
export async function crawlSites({ sites, maxPages = 20, onProgress }) {
  const list = [...new Set((sites || []).map((s) => String(s).trim()).filter(Boolean))]
  if (list.length === 0) throw new Error('Нет сайтов')

  const all = []
  for (const site of list) {
    const pages = await crawlOneSite(site, maxPages, onProgress)
    all.push(...pages)
  }
  return all
}

export { hostOf }
