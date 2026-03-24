import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getStock, postAddAchat, postAjusterStock } from '../controllers/stockController.js';
const router = Router();
router.get('/',                    authMiddleware, getStock);
router.post('/achats/add',         authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddAchat);
router.post('/ajuster/:sourceId',  authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAjusterStock);
export { router as stockRouter };
