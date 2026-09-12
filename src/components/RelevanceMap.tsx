import { useEffect, useRef, useState } from 'react'
import type { AnalysisBundle, MapDim, MapVariant, PageResult } from '../types'

type Props = {
  data: AnalysisBundle
  pages: PageResult[]
  threshold: number
  dim: MapDim
  showRays: boolean
  variant: MapVariant
}

type Pt = {
  x: number
  y: number
  z: number
  color: string
  size: number
  label: string
  alpha: number
}

const DEFAULT_YAW = 0.55
const DEFAULT_PITCH = 0.32
const DEFAULT_ZOOM = 1

export function RelevanceMap({
  data,
  pages,
  threshold,
  dim,
  showRays,
  variant,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [angles, setAngles] = useState({ yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{
    mode: 'rotate' | 'pan'
    x: number
    y: number
    yaw: number
    pitch: number
    panX: number
    panY: number
  } | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const above = pages.filter((p) => p.score >= threshold).length

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = wrap.clientWidth
    const h = wrap.clientHeight
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const pts: Pt[] = pages.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      color: data.siteColors[p.site] ?? '#888',
      size: (3 + p.score * 7) * Math.min(1.4, 0.7 + zoom * 0.3),
      alpha: p.score >= threshold ? 1 : 0.28,
      label: `${p.title}\n${p.url}\nбалл: ${p.score.toFixed(3)}`,
    }))

    const q: Pt = {
      x: data.queryPoint.x,
      y: data.queryPoint.y,
      z: data.queryPoint.z,
      color: '#f5c518',
      size: 13 * Math.min(1.4, 0.7 + zoom * 0.3),
      alpha: 1,
      label: `Запрос: ${data.query}`,
    }

    const all = [...pts, q]
    const xs = all.map((p) => p.x)
    const ys = all.map((p) => p.y)
    const zs = all.map((p) => p.z)
    const mid = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
      z: (Math.min(...zs) + Math.max(...zs)) / 2,
    }
    const span =
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
        Math.max(...zs) - Math.min(...zs),
        1e-6,
      ) || 1

    const project = (p: { x: number; y: number; z: number }) => {
      let x = (p.x - mid.x) / span
      let y = (p.y - mid.y) / span
      let z = (p.z - mid.z) / span

      if (dim === '3d') {
        const cy = Math.cos(angles.yaw)
        const sy = Math.sin(angles.yaw)
        const cp = Math.cos(angles.pitch)
        const sp = Math.sin(angles.pitch)
        const x1 = x * cy + z * sy
        const z1 = -x * sy + z * cy
        const y1 = y * cp - z1 * sp
        const z2 = y * sp + z1 * cp
        const scale = (200 * zoom) / (1.55 + z2 * 0.35)
        return {
          sx: w / 2 + x1 * scale + pan.x,
          sy: h / 2 - y1 * scale - 12 + pan.y,
          depth: z2,
        }
      }
      const scale = Math.min(w, h) * 0.4 * zoom
      return {
        sx: w / 2 + x * scale * 2 + pan.x,
        sy: h / 2 - y * scale * 2 + pan.y,
        depth: 0,
      }
    }

    ctx.fillStyle = '#0e1117'
    ctx.fillRect(0, 0, w, h)

    // Only 4 sides: bottom, back, left, right (open front & top)
    const half = span * 0.72
    const steps = 6
    const line = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
    ) => {
      const pa = project(a)
      const pb = project(b)
      ctx.beginPath()
      ctx.moveTo(pa.sx, pa.sy)
      ctx.lineTo(pb.sx, pb.sy)
      ctx.stroke()
    }

    ctx.strokeStyle = '#3a4252'
    ctx.lineWidth = 1
    for (let i = 0; i <= steps; i++) {
      const t = -half + (i / steps) * 2 * half
      // bottom y = -half
      line(
        { x: mid.x + t, y: mid.y - half, z: mid.z - half },
        { x: mid.x + t, y: mid.y - half, z: mid.z + half },
      )
      line(
        { x: mid.x - half, y: mid.y - half, z: mid.z + t },
        { x: mid.x + half, y: mid.y - half, z: mid.z + t },
      )
      // back z = -half
      line(
        { x: mid.x + t, y: mid.y - half, z: mid.z - half },
        { x: mid.x + t, y: mid.y + half, z: mid.z - half },
      )
      line(
        { x: mid.x - half, y: mid.y + t, z: mid.z - half },
        { x: mid.x + half, y: mid.y + t, z: mid.z - half },
      )
      // left x = -half
      line(
        { x: mid.x - half, y: mid.y + t, z: mid.z - half },
        { x: mid.x - half, y: mid.y + t, z: mid.z + half },
      )
      line(
        { x: mid.x - half, y: mid.y - half, z: mid.z + t },
        { x: mid.x - half, y: mid.y + half, z: mid.z + t },
      )
      // right x = +half
      line(
        { x: mid.x + half, y: mid.y + t, z: mid.z - half },
        { x: mid.x + half, y: mid.y + t, z: mid.z + half },
      )
      line(
        { x: mid.x + half, y: mid.y - half, z: mid.z + t },
        { x: mid.x + half, y: mid.y + half, z: mid.z + t },
      )
    }

    ctx.strokeStyle = '#5a6478'
    ctx.lineWidth = 1.4
    // edges of the 4 faces
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z - half },
      { x: mid.x + half, y: mid.y - half, z: mid.z - half },
    )
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z + half },
      { x: mid.x + half, y: mid.y - half, z: mid.z + half },
    )
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z - half },
      { x: mid.x - half, y: mid.y - half, z: mid.z + half },
    )
    line(
      { x: mid.x + half, y: mid.y - half, z: mid.z - half },
      { x: mid.x + half, y: mid.y - half, z: mid.z + half },
    )
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z - half },
      { x: mid.x - half, y: mid.y + half, z: mid.z - half },
    )
    line(
      { x: mid.x + half, y: mid.y - half, z: mid.z - half },
      { x: mid.x + half, y: mid.y + half, z: mid.z - half },
    )
    line(
      { x: mid.x - half, y: mid.y + half, z: mid.z - half },
      { x: mid.x + half, y: mid.y + half, z: mid.z - half },
    )
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z - half },
      { x: mid.x - half, y: mid.y + half, z: mid.z - half },
    )
    line(
      { x: mid.x - half, y: mid.y + half, z: mid.z - half },
      { x: mid.x - half, y: mid.y + half, z: mid.z + half },
    )
    line(
      { x: mid.x + half, y: mid.y - half, z: mid.z - half },
      { x: mid.x + half, y: mid.y + half, z: mid.z - half },
    )
    line(
      { x: mid.x + half, y: mid.y + half, z: mid.z - half },
      { x: mid.x + half, y: mid.y + half, z: mid.z + half },
    )
    line(
      { x: mid.x - half, y: mid.y - half, z: mid.z + half },
      { x: mid.x - half, y: mid.y + half, z: mid.z + half },
    )
    line(
      { x: mid.x + half, y: mid.y - half, z: mid.z + half },
      { x: mid.x + half, y: mid.y + half, z: mid.z + half },
    )

    if (variant === 'zones') {
      const bySite = new Map<string, PageResult[]>()
      for (const p of pages) {
        if (p.score < threshold) continue
        const list = bySite.get(p.site) ?? []
        list.push(p)
        bySite.set(p.site, list)
      }
      for (const [site, list] of bySite) {
        if (list.length < 2) continue
        const projected = list.map((p) => project(p))
        ctx.beginPath()
        projected.forEach((pr, i) => {
          if (i === 0) ctx.moveTo(pr.sx, pr.sy)
          else ctx.lineTo(pr.sx, pr.sy)
        })
        ctx.closePath()
        ctx.fillStyle = hexAlpha(data.siteColors[site] ?? '#888', 0.14)
        ctx.fill()
      }
    }

    const qProj = project(q)

    if (showRays) {
      ctx.strokeStyle = 'rgba(245,197,24,0.75)'
      ctx.lineWidth = 2.2
      for (const p of pages) {
        if (p.score < threshold) continue
        const pr = project(p)
        ctx.beginPath()
        ctx.moveTo(qProj.sx, qProj.sy)
        ctx.lineTo(pr.sx, pr.sy)
        ctx.stroke()
      }
    }

    const drawable = [
      ...pts.map((p, i) => ({ ...p, ...project(p), page: pages[i] })),
      { ...q, ...qProj, page: null as PageResult | null },
    ].sort((a, b) => a.depth - b.depth)

    for (const p of drawable) {
      ctx.globalAlpha = p.alpha
      if (p.page === null) {
        const s = p.size
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.moveTo(p.sx, p.sy - s)
        ctx.lineTo(p.sx + s, p.sy)
        ctx.lineTo(p.sx, p.sy + s)
        ctx.lineTo(p.sx - s, p.sy)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#fff3a0'
        ctx.lineWidth = 1.2
        ctx.stroke()

        ctx.globalAlpha = 1
        ctx.fillStyle = '#fafafa'
        ctx.font = '600 12px sans-serif'
        const label =
          data.query.length > 42 ? `${data.query.slice(0, 40)}…` : data.query
        ctx.fillText(label, p.sx + s + 8, p.sy + 4)
      } else {
        ctx.beginPath()
        ctx.fillStyle = p.color
        ctx.arc(p.sx, p.sy, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const legend = [
      ...Object.entries(data.siteColors).map(([site, color]) => ({
        label: site,
        color,
        diamond: false,
      })),
      { label: 'Запрос', color: '#f5c518', diamond: true },
    ]
    let ly = h - 16 - legend.length * 18
    ctx.font = '12px sans-serif'
    for (const item of legend) {
      if (item.diamond) {
        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.moveTo(w - 150, ly)
        ctx.lineTo(w - 144, ly + 6)
        ctx.lineTo(w - 150, ly + 12)
        ctx.lineTo(w - 156, ly + 6)
        ctx.closePath()
        ctx.fill()
      } else {
        ctx.fillStyle = item.color
        ctx.beginPath()
        ctx.arc(w - 150, ly + 6, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#fafafa'
      ctx.fillText(item.label, w - 138, ly + 10)
      ly += 18
    }

    if (hover) {
      const lines = hover.split('\n')
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16
      const th = lines.length * 16 + 12
      ctx.fillStyle = 'rgba(15,23,42,0.92)'
      ctx.strokeStyle = '#3d4450'
      ctx.fillRect(12, 48, tw, th)
      ctx.strokeRect(12, 48, tw, th)
      ctx.fillStyle = '#fafafa'
      lines.forEach((l, i) => ctx.fillText(l, 20, 66 + i * 16))
    }

    const onMove = (ev: MouseEvent) => {
      if (drag.current) {
        const dx = ev.clientX - drag.current.x
        const dy = ev.clientY - drag.current.y
        if (drag.current.mode === 'pan') {
          setPan({
            x: drag.current.panX + dx,
            y: drag.current.panY + dy,
          })
        } else if (dim === '3d') {
          setAngles({
            yaw: drag.current.yaw + dx * 0.01,
            pitch: Math.max(
              -1.2,
              Math.min(1.2, drag.current.pitch + dy * 0.01),
            ),
          })
        }
        return
      }
      const rect = canvas.getBoundingClientRect()
      const mx = ev.clientX - rect.left
      const my = ev.clientY - rect.top
      let found: string | null = null
      for (const p of [...drawable].reverse()) {
        const ddx = mx - p.sx
        const ddy = my - p.sy
        if (ddx * ddx + ddy * ddy < (p.size + 5) ** 2) {
          found = p.label
          break
        }
      }
      setHover(found)
    }

    const onDown = (ev: MouseEvent) => {
      const mode = ev.button === 1 || ev.shiftKey ? 'pan' : 'rotate'
      drag.current = {
        mode,
        x: ev.clientX,
        y: ev.clientY,
        yaw: angles.yaw,
        pitch: angles.pitch,
        panX: pan.x,
        panY: pan.y,
      }
    }
    const onUp = () => {
      drag.current = null
    }
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const factor = ev.deltaY > 0 ? 0.9 : 1.1
      setZoom((z) => Math.min(5, Math.max(0.35, z * factor)))
    }
    const onContext = (ev: Event) => ev.preventDefault()

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', onContext)
    window.addEventListener('mouseup', onUp)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', onContext)
      window.removeEventListener('mouseup', onUp)
    }
  }, [data, pages, threshold, dim, showRays, variant, angles, hover, zoom, pan])

  function resetView() {
    setAngles({ yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH })
    setZoom(DEFAULT_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="map-panel">
      <div className="plot-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="map-canvas" />
        <div className="map-controls">
          <button type="button" title="Приблизить" onClick={() => setZoom((z) => Math.min(5, z * 1.2))}>
            +
          </button>
          <button type="button" title="Отдалить" onClick={() => setZoom((z) => Math.max(0.35, z / 1.2))}>
            −
          </button>
          <button type="button" title="Сбросить вид" onClick={resetView}>
            ⟲
          </button>
        </div>
        <div className="map-hint">
          Колёсико — масштаб · ЛКМ — вращение · Shift+ЛКМ — сдвиг · {Math.round(zoom * 100)}%
        </div>
      </div>
      <p className="map-caption">
        Показано {above} из {pages.length} страниц выше порога. Ближе к жёлтому
        ромбу — выше балл к запросу; рядом друг с другом — похожий смысл; размер
        точки — близость к запросу; цвет — сайт.
      </p>
    </div>
  )
}

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${a})`
}
