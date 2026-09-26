import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listLeads, getLead, createLead, updateLead, deleteLead } from '../controllers/leadsController.js';
import { reviewRequestSent, reviewRequestReviewed } from '../controllers/reviewRequestsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listLeads);
router.post('/', createLead);
router.get('/:id', getLead);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);
router.post('/:id/review-request/sent', reviewRequestSent);
router.post('/:id/review-request/reviewed', reviewRequestReviewed);

export default router;
