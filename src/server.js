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
import { collections } from './models/collections.js'
import { User } from './models/User.js'
import { errorHandler, notFound } from './middleware/error.js'
import dns from 'dns'

dns.setServers(['1.1.1.1', '4.4.4.4']);
let pkg = { version: '' }
try { pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) } catch { /* version is only informational */ }

// Never let request bodies be used as query operators
mongoose.set('sanitizeFilter', true)

// One shared connection, reused between requests (important on Vercel, where the function stays warm for a while)
let dbReady
function connectDb() {
  dbReady ??= (async () => {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
    await Promise.all([User.init(), ...Object.values(collections).map((M) => M.init())]) // make sure indexes exist
  })().catch((err) => { dbReady = undefined; throw err })
  return dbReady
}

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
app.use(cors({
  origin: config.clientOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '2mb' }))
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }))

// Setup mistakes come back as a readable message (with CORS headers) instead of a crash
app.use('/api', async (_req, res, next) => {
  if (config.configError) return res.status(500).json({ error: 'Server is not configured correctly: ' + config.configError })
  try { await connectDb(); next() } catch (err) {
    console.error('[db]', err)
    res.status(503).json({ error: 'Cannot reach the database: ' + err.message })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true, version: pkg.version, db: mongoose.connection.readyState === 1 }))
app.use('/api/auth', authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api', notFound)

// If a built frontend sits next to the backend (../frontend/dist), serve it too
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use(errorHandler)

export default app

// Local run (not on Vercel)
if (!process.env.VERCEL) {
  try {
    await connectDb()
  } catch (err) {
    console.error(`\nCould not connect to MongoDB at ${config.mongoUri.replace(/\/\/.*@/, '//***@')}`)
    console.error(`Reason: ${err.message}\n`)
    console.error('Check that MongoDB is running (or that your Atlas connection string and IP allow-list are right), then edit backend/.env\n')
    process.exit(1)
  }
  app.listen(config.port, () => console.log(`API ready on http://localhost:${config.port}  (db: ${mongoose.connection.name})`))
  process.on('SIGINT', () => mongoose.disconnect().finally(() => process.exit(0)))
}
