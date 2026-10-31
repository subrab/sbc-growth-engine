import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPhotoVault } from '../controllers/photovaultController.js';

const router = Router();
router.get('/', requireAuth, getPhotoVault);

export default router;
