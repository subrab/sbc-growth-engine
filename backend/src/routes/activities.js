import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listActivities, createActivity } from '../controllers/activitiesController.js';

const router = Router();
router.use(requireAuth);
router.get('/', listActivities);
router.post('/', createActivity);

export default router;
