import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readSettings, updateSettings } from '../controllers/reviewRequestsController.js';

const router = Router();
router.use(requireAuth);
router.get('/', readSettings);
router.put('/', updateSettings);

export default router;
