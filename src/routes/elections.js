import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import { listElectionsController, getElectionController, castVoteController } from '../controllers/electionController.js'

export const router = Router()
router.get('/', requireAuth, listElectionsController)
router.get('/:id', requireAuth, getElectionController)
router.post('/:id/vote', requireAuth, castVoteController)
