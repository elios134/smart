import session from "express-session";
import prisma from "../../prisma/prismaClient.js";

/**
 * SMART-YIELD — Session Store Prisma
 * 
 * Stocke les sessions express en MariaDB via Prisma.
 * Survit aux redémarrages du serveur (PM2, reboot VPS).
 * Zéro dépendance supplémentaire.
 *
 * express-session attend un "Store" qui sait lire (get), écrire (set) et
 * supprimer (destroy) les sessions. On implémente ces méthodes ici en base.
 */
export class PrismaSessionStore extends session.Store {

    /**
     * @param {object} options — { cleanupInterval } : fréquence (ms) du nettoyage auto des sessions expirées.
     * Lance un minuteur de nettoyage récurrent et un premier nettoyage immédiat.
     */
    constructor(options = {}) {
        super();
        // Nettoyage automatique des sessions expirées (par défaut toutes les 15 min)
        const interval = options.cleanupInterval || 15 * 60 * 1000;
        this._cleanupTimer = setInterval(() => this.clearExpired(), interval);
        
        // Empêche le setInterval de bloquer la fermeture propre (graceful shutdown) de Node.js
        if (this._cleanupTimer.unref) this._cleanupTimer.unref();

        // Premier nettoyage au démarrage
        this.clearExpired();
    }

    // ── Lire une session ──────────────────────────────────
    // Appelée par express à chaque requête : retourne les données de session via callback(err, data).
    // Renvoie null si la session n'existe pas ou est expirée (auquel cas elle est supprimée).
    async get(sid, callback) {
        try {
            const row = await prisma.session.findUnique({ where: { sid } });

            if (!row) return callback(null, null);

            // Session expirée → la supprimer et retourner null
            if (new Date() > row.expiresAt) {
                // deleteMany évite un crash Prisma (RecordNotFound) si 2 requêtes simultanées tentent de supprimer la même session
                await prisma.session.deleteMany({ where: { sid } });
                return callback(null, null);
            }

            const data = JSON.parse(row.data);
            callback(null, data);
        } catch (err) {
            callback(err);
        }
    }

    // ── Écrire / mettre à jour une session ────────────────
    // Crée ou met à jour (upsert) la session et calcule sa date d'expiration à partir du cookie.
    async set(sid, sessionData, callback) {
        try {
            const maxAge = sessionData.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000;
            const expiresAt = new Date(Date.now() + maxAge);
            const data = JSON.stringify(sessionData);

            await prisma.session.upsert({
                where: { sid },
                update: { data, expiresAt },
                create: { sid, data, expiresAt },
            });

            callback?.(null);
        } catch (err) {
            callback?.(err);
        }
    }

    // ── Supprimer une session (logout) ────────────────────
    // Appelée lors de la déconnexion : retire la session de la base.
    async destroy(sid, callback) {
        try {
            await prisma.session.deleteMany({ where: { sid } });
            callback?.(null);
        } catch (err) {
            callback?.(null);
        }
    }

    // ── Nettoyer les sessions expirées ────────────────────
    // Supprime en une requête toutes les sessions dont la date d'expiration est dépassée.
    async clearExpired() {
        try {
            const result = await prisma.session.deleteMany({
                where: { expiresAt: { lt: new Date() } },
            });
            if (result.count > 0) {
                console.log(`[session] ${result.count} session(s) expirée(s) supprimée(s)`);
            }
        } catch (err) {
            console.error("[session] Erreur nettoyage :", err.message);
        }
    }

    // ── Arrêter le nettoyage (si besoin) ──────────────────
    // Stoppe le minuteur récurrent (utile pour un arrêt propre ou dans les tests).
    stopCleanup() {
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
        }
    }
}
