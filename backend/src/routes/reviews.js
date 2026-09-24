import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listReviews, updateReviewStatus, deleteReview } from '../controllers/reviewsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listReviews);
router.patch('/:id', updateReviewStatus);
router.delete('/:id', deleteReview);

export default router;
