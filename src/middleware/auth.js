import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { User } from '../models/User.js'
import { HttpError, wrap } from '../utils/http.js'

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpires })

/** Reads "Authorization: Bearer <token>", checks it, and sets req.user = { id }. */
export const requireAuth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new HttpError(401, 'Please log in')
  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch {
    throw new HttpError(401, 'Your session expired. Please log in again')
  }
  // Make sure the account still exists (it may have been deleted after the token was issued)
  if (!(await User.exists({ _id: payload.sub }))) throw new HttpError(401, 'Account not found')
  req.user = { id: payload.sub }
  next()
})
