import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import { createElectionController, addCandidateController, getAdminStatsController, startElectionController, stopElectionController, getElectionsController } from '../controllers/adminController.js'
import { readAudit } from '../utils/audit.js'
import { validate, createElectionSchema, addCandidateSchema } from '../middlewares/validation.js'

export const router = Router()
router.post('/elections', requireAuth, requireAdmin, validate(createElectionSchema), createElectionController)
router.get('/elections', requireAuth, requireAdmin, getElectionsController)
router.post('/elections/:electionId/start', requireAuth, requireAdmin, startElectionController)
router.post('/elections/:electionId/stop', requireAuth, requireAdmin, stopElectionController)
router.post('/elections/:electionId/candidates', requireAuth, requireAdmin, validate(addCandidateSchema), addCandidateController)
router.get('/audit', requireAuth, requireAdmin, async (_req, res) => {
	const rows = await readAudit(200)
	return res.json(rows)
})

// Admin stats with simple caching
router.get('/stats', requireAuth, requireAdmin, getAdminStatsController)


