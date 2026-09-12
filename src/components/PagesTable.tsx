import type { PageResult } from '../types'

type Props = {
  pages: PageResult[]
  threshold: number
}

export function PagesTable({ pages, threshold }: Props) {
  const sorted = [...pages].sort((a, b) => b.score - a.score)
  return (
    <div className="table-scroll tall">
      <table>
        <thead>
          <tr>
            <th>сайт</th>
            <th>url</th>
            <th>title</th>
            <th>балл</th>
            <th>релевантна</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className={p.score >= threshold ? '' : 'dim'}>
              <td>{p.site}</td>
              <td className="url">{p.url}</td>
              <td>{p.title}</td>
              <td>{p.score.toFixed(3)}</td>
              <td>{p.score >= threshold ? 'да' : 'нет'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
