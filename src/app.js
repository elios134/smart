import express from "express";
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";

import { setupRouter } from "./routes/setupRouter.js";
import { userRouter } from "./routes/userRouter.js";
import { employeRouter } from "./routes/employeRouter.js";
import { produitRouter } from "./routes/produitRouter.js";
import { stockRouter } from "./routes/stockRouter.js";
import { fournisseurRouter } from "./routes/fournisseurRouter.js";
import { productionRouter } from "./routes/productionRouter.js";
import { venteRouter } from "./routes/venteRouter.js";
import { reportingRouter } from "./routes/reportingRouter.js";

import session from "express-session";
import twig from "twig";
import { flashMiddleware } from "./middleware/flashMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (!process.env.SESSION_SECRET) {
  throw new Error("[app.js] SESSION_SECRET manquant dans .env — arrêt immédiat");
}

const app = express();

// ── Moteur de templates Twig ─────────────────────────────────
app.set("view engine", "twig");
app.set("views", path.join(__dirname, "../views"));

// ── Middlewares globaux ──────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use(flashMiddleware); // injecte flash.success / flash.error dans tous les templates

app.use(setupRouter);             // GET/POST /setup/:token — public, sans authguard
app.use(userRouter);              // /login, /logout, /home, /profil
app.use("/employes", employeRouter);
app.use("/produits", produitRouter);
app.use("/stock", stockRouter);
app.use("/fournisseurs", fournisseurRouter);
app.use("/production", productionRouter);
app.use("/ventes", venteRouter);
app.use("/reporting", reportingRouter);

export default app;