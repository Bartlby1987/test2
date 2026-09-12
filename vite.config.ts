import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import { crawlSites } from './server/crawlCore.mjs'

function crawlApiPlugin(): Plugin {
  return {
    name: 'crawl-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (
          req: Connect.IncomingMessage,
          res: ServerResponse,
          next: Connect.NextFunction,
        ) => {
          if (!req.url?.startsWith('/api/crawl')) return next()
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req as IncomingMessage) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const raw = Buffer.concat(chunks).toString('utf8')
            const body = raw
              ? (JSON.parse(raw) as { sites?: string[]; maxPages?: number })
              : {}
            const pages = await crawlSites({
              sites: body.sites || [],
              maxPages: Math.min(Number(body.maxPages) || 20, 40),
            })
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ pages, count: pages.length }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: e instanceof Error ? e.message : String(e),
              }),
            )
          }
        },
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), crawlApiPlugin()],
})
