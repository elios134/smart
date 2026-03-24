import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getReporting } from '../controllers/reportingController.js';
const router = Router();
router.get('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getReporting);
export { router as reportingRouter };
