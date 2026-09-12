import type { MapDim, ScoreMode } from '../types'

type Props = {
  query: string
  sitesText: string
  maxPages: number
  dim: MapDim
  scoreMode: ScoreMode
  showRays: boolean
  apiKey: string
  loading: boolean
  progress: string | null
  runsLeft: number
  runsTotal: number
  onChange: (patch: Partial<{
    query: string
    sitesText: string
    maxPages: number
    dim: MapDim
    scoreMode: ScoreMode
    showRays: boolean
    apiKey: string
  }>) => void
  onRun: () => void
}

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <label className="field">
        <span>Запрос</span>
        <input
          value={props.query}
          onChange={(e) => props.onChange({ query: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Сайты</span>
        <textarea
          rows={5}
          value={props.sitesText}
          onChange={(e) => props.onChange({ sitesText: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Макс. страниц на сайт</span>
        <input
          type="number"
          min={1}
          max={100}
          value={props.maxPages}
          onChange={(e) =>
            props.onChange({ maxPages: Number(e.target.value) || 1 })
          }
        />
      </label>

      <fieldset className="field radios">
        <legend>Карта</legend>
        <label>
          <input
            type="radio"
            checked={props.dim === '3d'}
            onChange={() => props.onChange({ dim: '3d' })}
          />
          3D
        </label>
        <label>
          <input
            type="radio"
            checked={props.dim === '2d'}
            onChange={() => props.onChange({ dim: '2d' })}
          />
          2D
        </label>
      </fieldset>

      <fieldset className="field radios">
        <legend>Балл страницы</legend>
        <label>
          <input
            type="radio"
            checked={props.scoreMode === 'best_fragment'}
            onChange={() => props.onChange({ scoreMode: 'best_fragment' })}
          />
          по лучшему фрагменту
        </label>
        <label>
          <input
            type="radio"
            checked={props.scoreMode === 'whole_page'}
            onChange={() => props.onChange({ scoreMode: 'whole_page' })}
          />
          по всей странице
        </label>
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={props.showRays}
          onChange={(e) => props.onChange({ showRays: e.target.checked })}
        />
        Лучи к запросу
      </label>

      <label className="field">
        <span>OpenAI key (опц.)</span>
        <input
          type="password"
          value={props.apiKey}
          placeholder="без ключа — local embed"
          onChange={(e) => props.onChange({ apiKey: e.target.value })}
          autoComplete="off"
        />
      </label>

      <button
        type="button"
        className="run-btn"
        disabled={props.loading}
        onClick={props.onRun}
      >
        {props.loading ? 'Сбор…' : 'Собрать данные'}
      </button>

      {props.progress && <p className="progress">{props.progress}</p>}

      <p className="runs">
        Запусков осталось: {props.runsLeft} из {props.runsTotal}
      </p>
    </aside>
  )
}
