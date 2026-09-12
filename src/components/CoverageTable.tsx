import type { SiteSummary } from '../types'

type Props = {
  rows: SiteSummary[]
}

export function CoverageTable({ rows }: Props) {
  return (
    <section className="block">
      <h2>Покрытие темы по сайтам</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>сайт</th>
              <th>всего_страниц</th>
              <th>релевантных</th>
              <th>средний_балл</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.site}>
                <td>{r.site}</td>
                <td>{r.totalPages}</td>
                <td>{r.relevantPages}</td>
                <td>{r.avgScore.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
