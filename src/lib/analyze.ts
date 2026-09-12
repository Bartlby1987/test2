import { chunkPage, collectSites, colorForSites, hostOf } from './crawl'
import { localEmbed, openAiEmbed } from './embeddings'
import { cosineSimilarity, pca } from './math'
import type { AnalysisBundle, Fragment, PageResult, ScoreMode, SiteSummary } from '../types'

export type RunParams = {
  query: string
  sitesText: string
  maxPages: number
  scoreMode: ScoreMode
  apiKey?: string
  onProgress?: (msg: string) => void
}

export async function runAnalysis(params: RunParams): Promise<AnalysisBundle> {
  const query = params.query.trim()
  if (!query) throw new Error('Укажите запрос')

  const siteLines = params.sitesText
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (siteLines.length === 0) throw new Error('Укажите хотя бы один сайт')

  const crawled = await collectSites(
    siteLines,
    params.maxPages,
    query,
    params.onProgress,
  )

  params.onProgress?.('Эмбеддинги…')

  const pageFragTexts = crawled.map((p) => chunkPage(p.text))
  const flatFrags: { pageIdx: number; text: string }[] = []
  pageFragTexts.forEach((frags, pageIdx) => {
    for (const text of frags) flatFrags.push({ pageIdx, text })
  })

  const pageTexts = crawled.map((p) => p.text)
  const texts = [query, ...pageTexts, ...flatFrags.map((f) => f.text)]
  const vectors = params.apiKey?.trim()
    ? await openAiEmbed(texts, params.apiKey.trim())
    : localEmbed(texts)

  const queryVec = vectors[0]
  const pageVecs = vectors.slice(1, 1 + pageTexts.length)
  const fragVecs = vectors.slice(1 + pageTexts.length)

  let fragCursor = 0
  const pages: PageResult[] = crawled.map((p, i) => {
    const count = pageFragTexts[i].length
    const fragments: Fragment[] = []
    for (let fi = 0; fi < count; fi++) {
      const score = cosineSimilarity(queryVec, fragVecs[fragCursor++])
      fragments.push({
        id: `f-${i}-${fi}`,
        pageId: `page-${i}`,
        site: p.site,
        url: p.url,
        text: pageFragTexts[i][fi],
        score,
      })
    }

    const bestFragmentScore =
      fragments.length === 0 ? 0 : Math.max(...fragments.map((f) => f.score))
    const wholePageScore = cosineSimilarity(queryVec, pageVecs[i])
    const score =
      params.scoreMode === 'best_fragment' ? bestFragmentScore : wholePageScore

    return {
      id: `page-${i}`,
      site: p.site,
      url: p.url,
      title: p.title,
      score,
      bestFragmentScore,
      wholePageScore,
      x: 0,
      y: 0,
      z: 0,
      fragments,
    }
  })

  params.onProgress?.('Проекция…')

  const layoutVecs = pages.map((page, i) => {
    if (params.scoreMode === 'whole_page') return pageVecs[i]
    if (page.fragments.length === 0) return pageVecs[i]
    let bestIdx = 0
    for (let j = 1; j < page.fragments.length; j++) {
      if (page.fragments[j].score > page.fragments[bestIdx].score) bestIdx = j
    }
    let g = 0
    for (let pi = 0; pi < i; pi++) g += pageFragTexts[pi].length
    return fragVecs[g + bestIdx]
  })

  const coords = pca([queryVec, ...layoutVecs], 3)
  const q = coords[0]

  // Hybrid map: direction from PCA (semantic neighbors), radius from score
  // (closer to query diamond = higher relevance — easier to read than raw PCA).
  for (let i = 0; i < pages.length; i++) {
    let dx = coords[i + 1][0] - q[0]
    let dy = coords[i + 1][1] - q[1]
    let dz = coords[i + 1][2] - q[2]
    let len = Math.hypot(dx, dy, dz)
    if (len < 1e-9) {
      // identical vector — fan out by site index
      const a = (i + 1) * 1.7
      dx = Math.cos(a)
      dy = Math.sin(a)
      dz = Math.sin(a * 0.5)
      len = Math.hypot(dx, dy, dz)
    }
    dx /= len
    dy /= len
    dz /= len

    const score = Math.min(1, Math.max(0, pages[i].score))
    const radius = (1 - score) ** 1.15 * 2.8 + 0.12
    pages[i].x = dx * radius
    pages[i].y = dy * radius
    pages[i].z = dz * radius
  }

  const sites = [...new Set(siteLines.map(hostOf))]

  return {
    query,
    pages,
    fragments: pages.flatMap((p) => p.fragments),
    queryPoint: { x: 0, y: 0, z: 0 },
    siteColors: colorForSites(sites),
  }
}

export function summarizeSites(
  pages: PageResult[],
  threshold: number,
  scoreMode: ScoreMode,
): SiteSummary[] {
  const bySite = new Map<string, PageResult[]>()
  for (const p of pages) {
    const list = bySite.get(p.site) ?? []
    list.push(p)
    bySite.set(p.site, list)
  }

  return [...bySite.entries()].map(([site, list]) => {
    const scored = list.map((p) => {
      const s =
        scoreMode === 'best_fragment' ? p.bestFragmentScore : p.wholePageScore
      return { ...p, score: s }
    })
    const relevant = scored.filter((p) => p.score >= threshold).length
    const avg =
      scored.reduce((a, b) => a + b.score, 0) / Math.max(scored.length, 1)
    return {
      site,
      totalPages: list.length,
      relevantPages: relevant,
      avgScore: avg,
    }
  })
}

export function withScoreMode(pages: PageResult[], scoreMode: ScoreMode): PageResult[] {
  return pages.map((p) => ({
    ...p,
    score:
      scoreMode === 'best_fragment' ? p.bestFragmentScore : p.wholePageScore,
  }))
}
