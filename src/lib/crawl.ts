/** Synthetic crawl corpus per known site + generic generator for others. */

type PageSeed = { path: string; title: string; body: string }

const CORPUS: Record<string, PageSeed[]> = {
  'site-analyzer.ru': [
    {
      path: '/',
      title: 'Анализ сайта онлайн',
      body: 'Сканирование сайта на ошибки, проверка SEO, битых ссылок и скорости загрузки. Полный аудит сайта за минуты.',
    },
    {
      path: '/scan',
      title: 'Сканер ошибок сайта',
      body: 'Автоматическое сканирование сайта на ошибки HTML, CSS, редиректы, 404 и дубли title. Отчёт по каждой странице.',
    },
    {
      path: '/seo-audit',
      title: 'SEO аудит',
      body: 'Технический SEO аудит: индексация, meta, структура заголовков, sitemap и robots.txt.',
    },
    {
      path: '/broken-links',
      title: 'Проверка битых ссылок',
      body: 'Поиск битых ссылок и редиректов при обходе сайта. Список URL с кодами ответа сервера.',
    },
    {
      path: '/speed',
      title: 'Скорость загрузки',
      body: 'Измерение времени ответа и Core Web Vitals. Рекомендации по ускорению страниц.',
    },
    {
      path: '/blog/crawl-errors',
      title: 'Типичные ошибки краулинга',
      body: 'Какие ошибки сканирования чаще всего мешают индексации и как их исправить.',
    },
    {
      path: '/pricing',
      title: 'Тарифы',
      body: 'Тарифы на проверку сайта: лимиты страниц, частота сканирования, экспорт отчётов.',
    },
    {
      path: '/about',
      title: 'О сервисе',
      body: 'Команда и история сервиса анализа сайтов. Контакты поддержки.',
    },
  ],
  'wordchecker.ru': [
    {
      path: '/',
      title: 'Проверка текста и сайта',
      body: 'Проверка орфографии, уникальности и SEO текста. Дополнительно — сканирование страниц на ошибки контента.',
    },
    {
      path: '/site-check',
      title: 'Проверка сайта',
      body: 'Сканирование сайта на ошибки контента: пустые title, дубли meta description, тонкий текст.',
    },
    {
      path: '/spelling',
      title: 'Орфография',
      body: 'Онлайн проверка орфографии русского текста. Подсветка ошибок и варианты исправления.',
    },
    {
      path: '/uniqueness',
      title: 'Уникальность',
      body: 'Проверка уникальности текста для SEO. Сравнение с индексом и отчёт по совпадениям.',
    },
    {
      path: '/seo-text',
      title: 'SEO текст',
      body: 'Анализ тошноты, воды и ключевых слов. Рекомендации по улучшению релевантности.',
    },
    {
      path: '/blog/errors',
      title: 'Ошибки на сайте',
      body: 'Как найти ошибки на сайте без программиста: чеклист сканирования и ручной проверки.',
    },
    {
      path: '/api',
      title: 'API',
      body: 'API для автоматической проверки текстов и страниц. Лимиты и примеры запросов.',
    },
    {
      path: '/contacts',
      title: 'Контакты',
      body: 'Связаться с поддержкой WordChecker. Форма обратной связи.',
    },
  ],
  'rocketcrawler.ru': [
    {
      path: '/',
      title: 'Rocket Crawler',
      body: 'Быстрый краулер для сканирования сайта на ошибки, сбора URL и технического SEO аудита.',
    },
    {
      path: '/features',
      title: 'Возможности краулера',
      body: 'Обход сайта, очередь URL, фильтры, экспорт в CSV. Поиск 404, редиректов и каноникалов.',
    },
    {
      path: '/crawl',
      title: 'Запуск сканирования',
      body: 'Запустите сканирование сайта на ошибки: укажите домен, лимит страниц и глубину обхода.',
    },
    {
      path: '/reports',
      title: 'Отчёты',
      body: 'Отчёты по ошибкам сканирования: коды ответа, время загрузки, битые изображения.',
    },
    {
      path: '/compare',
      title: 'Сравнение краулов',
      body: 'Сравните два прохода краулера и увидьте новые ошибки на сайте.',
    },
    {
      path: '/docs',
      title: 'Документация',
      body: 'Документация по настройке краулера, robots, user-agent и лимитам скорости.',
    },
    {
      path: '/blog/seo-crawl',
      title: 'SEO краулинг',
      body: 'Как использовать краулер для поиска технических ошибок SEO и улучшения индексации.',
    },
    {
      path: '/pricing',
      title: 'Цены',
      body: 'Цены на Rocket Crawler: страницы в месяц, параллельные сканирования.',
    },
  ],
}

const SITE_COLORS = ['#1f77b4', '#17becf', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

export function hostOf(urlOrHost: string): string {
  try {
    const u = urlOrHost.includes('://') ? new URL(urlOrHost) : new URL(`https://${urlOrHost}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return urlOrHost.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '')
  }
}

export function colorForSites(sites: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  sites.forEach((s, i) => {
    map[s] = SITE_COLORS[i % SITE_COLORS.length]
  })
  return map
}

function expandSeeds(seeds: PageSeed[], maxPages: number, host: string): PageSeed[] {
  const out = [...seeds]
  let i = 0
  while (out.length < maxPages) {
    const base = seeds[i % seeds.length]
    const n = Math.floor(out.length / seeds.length) + 1
    out.push({
      path: `${base.path.replace(/\/$/, '')}/p${n}`,
      title: `${base.title} · часть ${n}`,
      body: `${base.body} Дополнительные детали по ${host}: проверка страницы ${n}, статус коды, sitemap.`,
    })
    i++
  }
  return out.slice(0, maxPages)
}

function genericSeeds(host: string, maxPages: number, query: string): PageSeed[] {
  const topics = [
    `Обзор сервиса ${host}`,
    `Сканирование и проверка сайта`,
    `Ошибки индексации и SEO`,
    `Битые ссылки и редиректы`,
    `Технический аудит`,
    `Документация API`,
    `Блог: ${query}`,
    `Тарифы и лимиты`,
    `Контакты`,
    `Кейсы клиентов`,
  ]
  return Array.from({ length: maxPages }, (_, i) => ({
    path: i === 0 ? '/' : `/page-${i + 1}`,
    title: topics[i % topics.length],
    body: `${topics[i % topics.length]}. Сайт ${host}. Тема: ${query}. Анализ страниц, краулинг, ошибки HTML и SEO-сигналы.`,
  }))
}

export type CrawledPage = {
  site: string
  url: string
  title: string
  text: string
}

export async function collectSites(
  siteLines: string[],
  maxPages: number,
  query: string,
  onProgress?: (msg: string) => void,
): Promise<CrawledPage[]> {
  const sites = siteLines.map((s) => s.trim()).filter(Boolean).map(hostOf)
  const unique = [...new Set(sites)]
  const pages: CrawledPage[] = []

  for (const site of unique) {
    onProgress?.(`Сбор: ${site}…`)
    const base = CORPUS[site] ?? genericSeeds(site, maxPages, query)
    const seeds = expandSeeds(base, maxPages, site)
    // slight async feel
    await new Promise((r) => setTimeout(r, 180))
    for (const seed of seeds) {
      pages.push({
        site,
        url: `https://${site}${seed.path === '/' ? '/' : seed.path}`,
        title: seed.title,
        text: `${seed.title}. ${seed.body}`,
      })
    }
  }

  onProgress?.('Готово')
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
