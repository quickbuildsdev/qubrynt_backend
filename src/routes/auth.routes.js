import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/auth.js'
import { wrap } from '../utils/http.js'
import * as auth from '../controllers/auth.controller.js'

const router = Router()
// slow down password guessing
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } })

router.post('/register', limiter, wrap(auth.register))
router.post('/login', limiter, wrap(auth.login))
router.get('/me', requireAuth, wrap(auth.me))
router.delete('/me', requireAuth, limiter, wrap(auth.deleteAccount))

export default router
