import { Router } from 'express';
import {
  getAllQueries,
  createQuery,
  getQueryById,
  updateQueryStatus,
  createQueryValidation
} from '../controllers/query.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', getAllQueries);
router.post('/', createQueryValidation, createQuery);
router.get('/:id', getQueryById);
router.patch('/:id/status', updateQueryStatus);

export default router;
