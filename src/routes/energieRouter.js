import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import {
    getEnergie,
    postAddSource,
    postEditSource,
    postDeleteSource,
    postAddProduction,
    postTerminerProduction,
    postDeleteProduction,
    postAddVente,
    postSaveSeuil,
    postDeleteSeuil
} from '../controllers/energieController.js';

const router = Router();

// Consultation — tous les rôles
router.get('/',                        authMiddleware, getEnergie);

// Sources — ADMIN+
router.post('/sources/add',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddSource);
router.post('/sources/:id/edit',       authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postEditSource);
router.post('/sources/:id/delete',     authMiddleware, requireRole('SUPER_ADMIN'),           postDeleteSource);

// Productions — tous les rôles
router.post('/productions/add',        authMiddleware, postAddProduction);
router.post('/productions/:id/terminer', authMiddleware, postTerminerProduction);
router.post('/productions/:id/delete', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postDeleteProduction);

// Ventes — ADMIN+
router.post('/ventes/add',             authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddVente);

// Seuils — ADMIN+
router.post('/seuils/save',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postSaveSeuil);
router.post('/seuils/:id/delete',      authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postDeleteSeuil);

export { router as energieRouter };
