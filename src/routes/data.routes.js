import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { wrap } from '../utils/http.js'
import * as data from '../controllers/data.controller.js'

const router = Router()
router.use(requireAuth)
router.get('/', wrap(data.getAll))
router.post('/sync', wrap(data.sync))

export default router
