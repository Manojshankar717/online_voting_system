import { Router } from 'express'
import { router as authRouter } from './auth.js'
import { router as electionRouter } from './elections.js'
import { router as adminRouter } from './admin.js'

export const router = Router()
router.use('/auth', authRouter)
router.use('/elections', electionRouter)
router.use('/admin', adminRouter)
