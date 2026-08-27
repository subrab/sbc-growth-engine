import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listTasks, createTask, updateTask } from '../controllers/tasksController.js';

const router = Router();
router.use(requireAuth);
router.get('/', listTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);

export default router;
