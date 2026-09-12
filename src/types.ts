export type ScoreMode = 'best_fragment' | 'whole_page'
export type MapDim = '3d' | '2d'
export type MapVariant = 'zones' | 'simple'
export type MainTab = 'map' | 'pages' | 'fragments'

export type Fragment = {
  id: string
  pageId: string
  site: string
  url: string
  text: string
  score: number
}

export type PageResult = {
  id: string
  site: string
  url: string
  title: string
  score: number
  bestFragmentScore: number
  wholePageScore: number
  x: number
  y: number
  z: number
  fragments: Fragment[]
}

export type SiteSummary = {
  site: string
  totalPages: number
  relevantPages: number
  avgScore: number
}

export type AnalysisBundle = {
  query: string
  pages: PageResult[]
  fragments: Fragment[]
  queryPoint: { x: number; y: number; z: number }
  siteColors: Record<string, string>
}
