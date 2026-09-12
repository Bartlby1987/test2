import { useMemo, useState } from 'react'
import { runAnalysis, summarizeSites, withScoreMode } from './lib/analyze'
import type {
  AnalysisBundle,
  MainTab,
  MapDim,
  MapVariant,
  ScoreMode,
} from './types'
import { Sidebar } from './components/Sidebar'
import { CoverageTable } from './components/CoverageTable'
import { PagesTable } from './components/PagesTable'
import { FragmentsTable } from './components/FragmentsTable'
import { RelevanceMap } from './components/RelevanceMap'
import './App.css'

const DEFAULT_SITES = `https://site-analyzer.ru/
https://rocketcrawler.ru/
https://thrive-it.ru/`

export default function App() {
  const [query, setQuery] = useState('сканирование сайта на ошибки')
  const [sitesText, setSitesText] = useState(DEFAULT_SITES)
  const [maxPages, setMaxPages] = useState(20)
  const [dim, setDim] = useState<MapDim>('3d')
  const [scoreMode, setScoreMode] = useState<ScoreMode>('best_fragment')
  const [showRays, setShowRays] = useState(true)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_key') || '')
  const [threshold, setThreshold] = useState(0.35)
  const [tab, setTab] = useState<MainTab>('map')
  const [variant, setVariant] = useState<MapVariant>('simple')

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null)

  const pages = useMemo(
    () => (bundle ? withScoreMode(bundle.pages, scoreMode) : []),
    [bundle, scoreMode],
  )

  const coverage = useMemo(
    () => (bundle ? summarizeSites(bundle.pages, threshold, scoreMode) : []),
    [bundle, threshold, scoreMode],
  )

  async function onRun() {
    setError(null)
    setLoading(true)
    setProgress('Старт…')
    try {
      if (apiKey) localStorage.setItem('openai_key', apiKey)
      else localStorage.removeItem('openai_key')

      const result = await runAnalysis({
        query,
        sitesText,
        maxPages,
        scoreMode,
        apiKey: apiKey || undefined,
        onProgress: setProgress,
      })
      setBundle(result)
      setTab('map')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div className="layout">
      <Sidebar
        query={query}
        sitesText={sitesText}
        maxPages={maxPages}
        dim={dim}
        scoreMode={scoreMode}
        showRays={showRays}
        apiKey={apiKey}
        loading={loading}
        progress={progress}
        onChange={(patch) => {
          if (patch.query !== undefined) setQuery(patch.query)
          if (patch.sitesText !== undefined) setSitesText(patch.sitesText)
          if (patch.maxPages !== undefined) setMaxPages(patch.maxPages)
          if (patch.dim !== undefined) setDim(patch.dim)
          if (patch.scoreMode !== undefined) setScoreMode(patch.scoreMode)
          if (patch.showRays !== undefined) setShowRays(patch.showRays)
          if (patch.apiKey !== undefined) setApiKey(patch.apiKey)
        }}
        onRun={onRun}
      />

      <main className="main">
        <h1>Карта релевантности</h1>

        {error && <p className="error">{error}</p>}

        {bundle && (
          <>
            <section className="block">
              <label className="threshold">
                <span>Порог релевантности</span>
                <div className="slider-row">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                  />
                  <strong>{threshold.toFixed(2)}</strong>
                </div>
              </label>
            </section>

            <CoverageTable rows={coverage} />

            <div className="tabs">
              {(
                [
                  ['map', 'Карта'],
                  ['pages', 'Таблица страниц'],
                  ['fragments', 'Фрагменты страниц'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? 'tab active' : 'tab'}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'map' && (
              <section className="block map-block">
                <fieldset className="radios inline">
                  <legend>Вариант карты</legend>
                  <label>
                    <input
                      type="radio"
                      checked={variant === 'zones'}
                      onChange={() => setVariant('zones')}
                    />
                    Смысловые зоны
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={variant === 'simple'}
                      onChange={() => setVariant('simple')}
                    />
                    Простая
                  </label>
                </fieldset>

                <RelevanceMap
                  data={bundle}
                  pages={pages}
                  threshold={threshold}
                  dim={dim}
                  showRays={showRays}
                  variant={variant}
                />
              </section>
            )}

            {tab === 'pages' && (
              <section className="block">
                <PagesTable pages={pages} threshold={threshold} />
              </section>
            )}

            {tab === 'fragments' && (
              <section className="block">
                <FragmentsTable
                  fragments={bundle.fragments}
                  threshold={threshold}
                />
              </section>
            )}
          </>
        )}

        {!bundle && !loading && (
          <p className="hint">
            Укажите запрос и сайты слева, затем нажмите «Собрать данные».
          </p>
        )}
      </main>
    </div>
  )
}
