import { config } from '../config/index.js'

export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' })

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
  const status = err.status || 500
  if (status >= 500) console.error(err)
  res.status(status).json({ error: status >= 500 && config.isProd ? 'Something went wrong' : err.message })
}
