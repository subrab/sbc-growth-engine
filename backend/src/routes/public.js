import { Router } from 'express';
import { publicRateLimiter } from '../middleware/rateLimiter.js';
import { createPublicLead, submitAssessment } from '../controllers/publicController.js';
import { submitReview, listApprovedReviews } from '../controllers/reviewsController.js';

const router = Router();

// Reading approved reviews is not rate-limited — the public website loads it on every visit.
router.get('/reviews', listApprovedReviews);

router.use(publicRateLimiter);
router.post('/leads', createPublicLead);
router.post('/assessment', submitAssessment);
router.post('/reviews', submitReview);

export default router;
