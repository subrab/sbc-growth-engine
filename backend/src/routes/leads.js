import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listLeads, getLead, createLead, updateLead, deleteLead } from '../controllers/leadsController.js';

const router = Router();
router.use(requireAuth);

router.get('/', listLeads);
router.post('/', createLead);
router.get('/:id', getLead);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
