import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protected route
router.get('/stats', authenticateToken, getDashboardStats);

export default router;
