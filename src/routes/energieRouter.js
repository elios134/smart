// ── energieRouter.js ──────────────────────────────────────────
// Routeur du module "Énergie" : sources d'énergie, seuils d'alerte,
// historique des prix et notifications associées.
// La gestion des sources et des seuils est réservée aux ADMIN/SUPER_ADMIN
// (suppression d'une source = SUPER_ADMIN). Les routes "API" de lecture
// (historique, notifications) sont ouvertes à tout utilisateur connecté.
// ──────────────────────────────────────────────────────────────
import { Router } from 'express';
import { authMiddleware, requireRole } from '../services/authMiddleware.js';
import { getEnergie, postAddSource, postImportSources, postEditSource, postDeleteSource, postSaveSeuil, postDeleteSeuil, apiGetNotifications, apiClearNotifications, apiPrixHistorique } from '../controllers/energieController.js';
const router = Router();
// GET /  → tableau de bord énergie (ADMIN / SUPER_ADMIN)
router.get('/',                        authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), getEnergie);
// POST /sources/add  → ajoute une source d'énergie (ADMIN / SUPER_ADMIN)
router.post('/sources/add',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postAddSource);
// POST /sources/import  → crée les sources manquantes depuis le mix ENTSO-E (ADMIN / SUPER_ADMIN)
router.post('/sources/import',         authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postImportSources);
// POST /sources/:id/edit  → modifie la source :id (ADMIN / SUPER_ADMIN)
router.post('/sources/:id/edit',       authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postEditSource);
// POST /sources/:id/delete  → supprime la source :id (SUPER_ADMIN uniquement)
router.post('/sources/:id/delete',     authMiddleware, requireRole('SUPER_ADMIN'),           postDeleteSource);
// POST /seuils/save  → crée/met à jour un seuil d'alerte (ADMIN / SUPER_ADMIN)
router.post('/seuils/save',            authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postSaveSeuil);
// POST /seuils/:id/delete  → supprime le seuil :id (ADMIN / SUPER_ADMIN)
router.post('/seuils/:id/delete',      authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), postDeleteSeuil);
// GET /prix-historique  → API JSON : historique des prix (tout utilisateur connecté)
router.get('/prix-historique',          authMiddleware, apiPrixHistorique);
// GET /notifications  → API JSON : liste des notifications d'alerte
router.get('/notifications',           authMiddleware, apiGetNotifications);
// POST /notifications/clear  → API : marque/efface les notifications
router.post('/notifications/clear',    authMiddleware, apiClearNotifications);
export { router as energieRouter };
