import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getVentes, getVenteDetail, postAddVente, postDeleteVente } from '../controllers/venteController.js';
const router = Router();
router.get('/',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getVentes);
router.get('/:id',         authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getVenteDetail);
router.post('/add',        authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddVente);
router.post('/:id/delete', authMiddleware, requireRole('SUPER_ADMIN'),          postDeleteVente);
export { router as venteRouter };
