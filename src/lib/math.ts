/** Cosine similarity */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

function topEigen(centered: number[][], dim: number, exclude?: number[]): number[] {
  let w = new Array(dim).fill(0).map(() => Math.random() - 0.5)
  for (let iter = 0; iter < 50; iter++) {
    const Aw = new Array(dim).fill(0)
    for (const row of centered) {
      let proj = 0
      for (let i = 0; i < dim; i++) proj += row[i] * w[i]
      for (let i = 0; i < dim; i++) Aw[i] += row[i] * proj
    }
    if (exclude) {
      let d = 0
      for (let i = 0; i < dim; i++) d += Aw[i] * exclude[i]
      for (let i = 0; i < dim; i++) Aw[i] -= d * exclude[i]
    }
    const norm = Math.sqrt(Aw.reduce((s, x) => s + x * x, 0)) || 1
    w = Aw.map((x) => x / norm)
  }
  return w
}

/** PCA to 2 or 3 dimensions */
export function pca(vectors: number[][], dims: 2 | 3): number[][] {
  if (vectors.length === 0) return []
  const dim = vectors[0].length
  const n = vectors.length
  const mean = new Array(dim).fill(0)
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i]
  for (let i = 0; i < dim; i++) mean[i] /= n

  const centered = vectors.map((v) => v.map((x, i) => x - mean[i]))
  const pcs: number[][] = []
  for (let k = 0; k < dims; k++) {
    pcs.push(topEigen(centered, dim, pcs[k - 1]))
  }

  return centered.map((row) =>
    pcs.map((pc) => {
      let s = 0
      for (let i = 0; i < dim; i++) s += row[i] * pc[i]
      return s
    }),
  )
}
