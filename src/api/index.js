// Vercel serverless entry. Vercel runs this file per request instead of src/server.js (which calls listen()).
// Everything heavy is imported lazily so that a configuration mistake (missing JWT_SECRET, bad MONGODB_URI)
// comes back as a readable JSON error WITH CORS headers, instead of a crashed function.
import cors from 'cors'

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
const corsMw = cors({
  origin: origins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

let ready // cached between requests while the function stays warm

async function boot() {
  const { default: mongoose } = await import('mongoose')
  const { config } = await import('../src/config/index.js')
  const { createApp } = await import('../src/app.js')
  const { collections } = await import('../src/models/collections.js')
  const { User } = await import('../src/models/User.js')
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 5 })
  await Promise.all([User.init(), ...Object.values(collections).map((M) => M.init())])
  return createApp()
}

export default async function handler(req, res) {
  try {
    ready ??= boot()
    const app = await ready
    return app(req, res)
  } catch (err) {
    ready = undefined // try again on the next request
    console.error('[boot failed]', err)
    return corsMw(req, res, () => {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server is not configured correctly: ' + err.message }))
    })
  }
}