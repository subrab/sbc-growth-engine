import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listProperties, createProperty, updateProperty, deleteProperty, checkNow, listChecks } from '../controllers/clientCareController.js';

const router = Router();
router.use(requireAuth);
router.get('/', listProperties);
router.post('/', createProperty);
router.post('/check', checkNow);
router.get('/:id/checks', listChecks);
router.patch('/:id', updateProperty);
router.delete('/:id', deleteProperty);

export default router;
