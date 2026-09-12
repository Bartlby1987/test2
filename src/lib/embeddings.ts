export function localEmbed(texts: string[], dim = 96): number[][] {
  return texts.map((text) => {
    const vec = new Array(dim).fill(0)
    const tokens = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)

    for (const token of tokens) {
      const h = hash(token)
      const i = h % dim
      const sign = h & 1 ? 1 : -1
      vec[i] += sign
      vec[hash(token.slice(0, Math.min(4, token.length))) % dim] += 0.45 * sign
    }
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1
    return vec.map((x) => x / norm)
  })
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export async function openAiEmbed(
  texts: string[],
  apiKey: string,
  model = 'text-embedding-3-small',
): Promise<number[][]> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64)
    const res = await client.embeddings.create({ model, input: batch })
    out.push(...[...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding))
  }
  return out
}
