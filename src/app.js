import express from 'express';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import { setupRouter }         from './routes/setupRouter.js';
import { userRouter }          from './routes/userRouter.js';
import { employeRouter }       from './routes/employeRouter.js';
import { fournisseurRouter }   from './routes/fournisseurRouter.js';
import { stockRouter }         from './routes/stockRouter.js';
import { planificationRouter } from './routes/planificationRouter.js';
import { energieRouter }       from './routes/energieRouter.js';
import { venteRouter }         from './routes/venteRouter.js';
import { reportingRouter }     from './routes/reportingRouter.js';

import session from 'express-session';
import twig from 'twig';
import { flashMiddleware }    from './middleware/flashMiddleware.js';
import { PrismaSessionStore } from './services/sessionStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const CINQ_ANS   = 5 * 365 * 24 * 60 * 60 * 1000;

if (!process.env.SESSION_SECRET) throw new Error('[app.js] SESSION_SECRET manquant dans .env');

const app = express();
app.set('view engine', 'twig');
app.set('views', path.join(__dirname, '../views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({ secret: process.env.SESSION_SECRET, store: new PrismaSessionStore(), resave: false, saveUninitialized: false, cookie: { maxAge: CINQ_ANS, httpOnly: true, secure: false } }));
app.use(flashMiddleware);

app.use(setupRouter);
app.use(userRouter);
app.use('/employes',      employeRouter);
app.use('/fournisseurs',  fournisseurRouter);
app.use('/stock',         stockRouter);
app.use('/planification', planificationRouter);
app.use('/energie',       energieRouter);
app.use('/ventes',        venteRouter);
app.use('/reporting',     reportingRouter);

export default app;
