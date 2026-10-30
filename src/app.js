import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { config } from './config/index.js'
import authRoutes from './routes/auth.routes.js'
import dataRoutes from './routes/data.routes.js'
import { errorHandler, notFound } from './middleware/error.js'
import dns from 'dns'

dns.setServers(['1.1.1.1','4.4.4.4']);
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

// Never let request bodies be used as query operators
mongoose.set('sanitizeFilter', true)

export function createApp() {
  const app = express()
  if (config.trustProxy) app.set('trust proxy', 1)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          // quick links show the site's favicon from Google's favicon service
          imgSrc: ["'self'", 'data:', 'https://www.google.com', 'https://*.gstatic.com'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
    })
  )
  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json({ limit: '2mb' }))
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }))

  app.get('/api/health', (_req, res) => res.json({ ok: true, version: pkg.version, db: mongoose.connection.readyState === 1 }))
  app.use('/api/auth', authRoutes)
  app.use('/api/data', dataRoutes)
  app.use('/api', notFound)

  // In production the backend also serves the built frontend (../frontend/dist)
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  app.use(errorHandler)
  return app
}
