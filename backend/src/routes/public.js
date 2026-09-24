import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { publicRateLimiter } from '../middleware/rateLimiter.js';
import { createPublicLead, submitAssessment } from '../controllers/publicController.js';
import { submitReview, listApprovedReviews } from '../controllers/reviewsController.js';
import { track } from '../controllers/insightsController.js';

const router = Router();

// Reading approved reviews is not rate-limited — the public website loads it on every visit.
router.get('/reviews', listApprovedReviews);

// Website analytics beacons: small and frequent, so they get their own generous limit
// and accept text/plain bodies (what navigator.sendBeacon sends).
const trackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
router.post('/track', trackLimiter, express.text({ type: ['text/plain', 'application/json'], limit: '16kb' }), track);

router.use(publicRateLimiter);
router.post('/leads', createPublicLead);
router.post('/assessment', submitAssessment);
router.post('/reviews', submitReview);

export default router;
