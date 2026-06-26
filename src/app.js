// ============================================================================
// src/app.js — Configuration de l'application Express
// ----------------------------------------------------------------------------
// Ce fichier construit l'application web : moteur de templates (Twig), chaîne
// de middlewares (sécurité, sessions, CSRF, fichiers statiques...) puis montage
// des différents routeurs (une zone de l'app par routeur). Il n'écoute aucun
// port : c'est server.js qui s'en charge. L'app est simplement exportée à la fin.
//
// L'ORDRE des `app.use(...)` est important : chaque requête traverse les
// middlewares de haut en bas, donc les routeurs (en bas) bénéficient de tout ce
// qui a été préparé avant (session, jeton CSRF, messages flash...).
// ============================================================================

import express from 'express';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Routeurs : chacun regroupe les routes d'une partie de l'application ---
import { setupRouter }         from './routes/setupRouter.js';
import { userRouter }          from './routes/userRouter.js';
import { employeRouter }       from './routes/employeRouter.js';
import { fournisseurRouter }   from './routes/fournisseurRouter.js';
import { stockRouter }         from './routes/stockRouter.js';
import { planificationRouter } from './routes/planificationRouter.js';
import { energieRouter }       from './routes/energieRouter.js';
import { venteRouter }         from './routes/venteRouter.js';
import { reportingRouter }     from './routes/reportingRouter.js';

// --- Middlewares et outils ---
import session from 'express-session';   // Gestion des sessions utilisateur
import twig from 'twig';                 // Moteur de templates pour générer le HTML
import { flashMiddleware }    from './middleware/flashMiddleware.js';
import { PrismaSessionStore } from './services/sessionStore.js';
import { securityHeaders }    from './middleware/securityHeaders.js';
import { csrfToken, csrfProtection } from './middleware/csrf.js';

// Reconstruction de __dirname (absent en modules ES) pour les chemins absolus
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
// Durée de vie du cookie de session (24 h, exprimée en millisecondes)
const VINGT_QUATRE_HEURES = 24 * 60 * 60 * 1000;
// Vrai en production : permet d'activer certaines protections (ex. cookie « secure »)
const IS_PROD = process.env.NODE_ENV === 'production';

// Sécurité : on refuse de démarrer si la clé secrète des sessions est absente
if (!process.env.SESSION_SECRET) throw new Error('[app.js] SESSION_SECRET manquant dans .env');

const app = express();
// Derrière un reverse-proxy (VPS) : nécessaire pour que req.protocol/secure et req.ip soient corrects
app.set('trust proxy', 1);
// Twig comme moteur de rendu, avec le dossier des vues (templates HTML)
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, '../views'));

// 1) En-têtes de sécurité (CSP, nosniff, anti-clickjacking) sur toutes les réponses
app.use(securityHeaders);

// 2) Lecture du corps des requêtes : JSON et formulaires HTML (url-encoded)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 3) Fichiers statiques (CSS, images, JS du front) servis depuis /public
app.use(express.static(path.join(__dirname, '../public')));
// 4) Sessions : identifie l'utilisateur d'une requête à l'autre via un cookie
app.use(session({
  secret: process.env.SESSION_SECRET,        // Clé secrète qui signe le cookie de session
  store: new PrismaSessionStore(),           // Sessions stockées en base de données (via Prisma)
  resave: false,                             // Ne ré-enregistre pas une session inchangée
  saveUninitialized: false,                  // Ne crée pas de session tant qu'on n'y met rien
  cookie: {
    maxAge: VINGT_QUATRE_HEURES,             // Le cookie expire au bout de 24 h
    httpOnly: true,                          // Cookie inaccessible au JavaScript du navigateur (anti-vol)
    secure: IS_PROD,                         // En production : cookie envoyé uniquement en HTTPS
    sameSite: 'lax'                          // Limite l'envoi du cookie aux requêtes cross-site (anti-CSRF)
  }
}));
// 5) CSRF : génère le jeton (exposé aux vues) puis le valide sur les requêtes mutantes
app.use(csrfToken);
app.use(csrfProtection);
// 6) Messages flash : messages temporaires (succès/erreur) affichés après une redirection
app.use(flashMiddleware);

// --- Montage des routeurs ---
// Sans préfixe : pages d'installation/configuration initiale et authentification
app.use(setupRouter);
app.use(userRouter);
// Avec préfixe : chaque routeur gère les URL commençant par son chemin
app.use('/employes',      employeRouter);      // Gestion des employés
app.use('/fournisseurs',  fournisseurRouter);  // Gestion des fournisseurs
app.use('/stock',         stockRouter);        // Gestion du stock
app.use('/planification', planificationRouter);// Planification
app.use('/energie',       energieRouter);      // Suivi et déclenchements énergie
app.use('/ventes',        venteRouter);        // Ventes
app.use('/reporting',     reportingRouter);    // Rapports / statistiques

// On exporte l'app configurée ; c'est server.js qui la mettra en écoute
export default app;
