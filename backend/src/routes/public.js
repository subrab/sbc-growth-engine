import { Router } from 'express';
import { publicRateLimiter } from '../middleware/rateLimiter.js';
import { createPublicLead, submitAssessment } from '../controllers/publicController.js';

const router = Router();
router.use(publicRateLimiter);
router.post('/leads', createPublicLead);
router.post('/assessment', submitAssessment);

export default router;
