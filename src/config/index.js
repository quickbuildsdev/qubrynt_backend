import 'dotenv/config'
import crypto from 'node:crypto'

const isProd = process.env.NODE_ENV === 'production'

let jwtSecret = process.env.JWT_SECRET
if (!jwtSecret || jwtSecret === 'change-me-to-a-long-random-string') {
  if (isProd) throw new Error('JWT_SECRET must be set to a long random string in production')
  jwtSecret = crypto.randomBytes(48).toString('hex')
  console.warn('[config] JWT_SECRET not set: using a temporary secret. Everyone is logged out when the server restarts.')
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qubrynt',
  jwtSecret,
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  trustProxy: process.env.TRUST_PROXY === '1',
}
