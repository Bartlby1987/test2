import type { Fragment } from '../types'

type Props = {
  fragments: Fragment[]
  threshold: number
}

export function FragmentsTable({ fragments, threshold }: Props) {
  const sorted = [...fragments].sort((a, b) => b.score - a.score)
  return (
    <div className="table-scroll tall">
      <table>
        <thead>
          <tr>
            <th>сайт</th>
            <th>url</th>
            <th>фрагмент</th>
            <th>балл</th>
            <th>≥ порога</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr key={f.id} className={f.score >= threshold ? '' : 'dim'}>
              <td>{f.site}</td>
              <td className="url">{f.url}</td>
              <td>{f.text}</td>
              <td>{f.score.toFixed(3)}</td>
              <td>{f.score >= threshold ? 'да' : 'нет'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
