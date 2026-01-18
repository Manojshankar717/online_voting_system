import { Router } from 'express';

// Import individual route modules
import { router as authRouter } from './auth.js';
import { router as electionRouter } from './elections.js';
import { router as adminRouter } from './admin.js';

export const router = Router();

// Mount individual route modules
router.use('/auth', authRouter);
router.use('/elections', electionRouter);
router.use('/admin', adminRouter);

// Export the router
export default router;
