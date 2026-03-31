import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getReporting, exportCSV, exportPDF } from '../controllers/reportingController.js';
const router = Router();
router.get('/',              authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getReporting);
router.get('/export/csv',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), exportCSV);
router.get('/export/pdf',   authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), exportPDF);
export { router as reportingRouter };
