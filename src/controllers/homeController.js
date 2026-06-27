/**
 * Contrôleur de la page d'accueil (tableau de bord).
 * Rôle : rassembler les principaux indicateurs (KPIs) de l'application
 * — énergie produite/stockée, chiffre d'affaires du jour, sessions en cours —
 * puis afficher la vue du tableau de bord.
 */
import prisma from '../../prisma/prismaClient.js';
import { getMixEnergetique } from '../services/energieService.js';

// GET /home
// Affiche le tableau de bord : calcule les KPIs du jour à partir des données
// en base puis rend la vue `home.twig`. Ne reçoit pas de paramètre particulier,
// utilise simplement la session de l'utilisateur connecté.
export async function getHome(req, res) {
    try {
        // On fixe l'heure à minuit pour comparer uniquement la date du jour
        // (et ainsi ne garder que ce qui s'est passé aujourd'hui).
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Promise.all lance les 4 requêtes en parallèle (plus rapide qu'une à une) :
        // les sources d'énergie (avec leur stock et seuil), le nombre de sessions
        // en cours, les ventes du jour et la liste des employés.
        // Les ventes du jour incluent leur source pour pouvoir calculer la marge
        // (prix encaissé − coût de production). `dernieresVentes` = 3 ventes les
        // plus récentes affichées sur le tableau de bord (avec source et client).
        const [sources, sessionsEnCours, ventesAujourdhui, employes, dernieresVentes, mix] = await Promise.all([
            prisma.sourceEnergie.findMany({
                include: { stock: true, seuil: true },
                orderBy: { nom: 'asc' }
            }),
            prisma.sessionEnergie.count({ where: { statut: 'EN_COURS' } }),
            prisma.venteEnergie.findMany({ where: { createdAt: { gte: today } }, include: { source: true } }),
            prisma.user.findMany({
                where:   { role: { in: ['ADMIN', 'OPERATEUR'] } },
                orderBy: { lastName: 'asc' }
            }),
            prisma.venteEnergie.findMany({
                orderBy: { createdAt: 'desc' },
                take: 3,
                include: { source: true, tiers: true }
            }),
            // Mix énergétique national en direct (service caché 1h, null-safe).
            getMixEnergetique()
        ]);

        // Total d'énergie en stock (somme des quantités de chaque source).
        const mwhStockes    = sources.reduce((acc, s) => acc + (s.stock?.quantite ?? 0), 0);
        // Chiffre d'affaires du jour (somme des montants des ventes d'aujourd'hui).
        const caAujourdhui  = ventesAujourdhui.reduce((acc, v) => acc + v.total, 0);
        // Marge du jour = CA − coût de production des ventes (quantité × coût/MWh de la source).
        const margeAujourdhui = ventesAujourdhui.reduce(
            (acc, v) => acc + (v.total - (v.quantite * (v.source?.coutProduction ?? 0))), 0);

        // Sessions de production terminées aujourd'hui, pour calculer l'énergie produite.
        const sessionsDuJour = await prisma.sessionEnergie.findMany({
            where: { statut: 'TERMINEE', finReel: { gte: today } }
        });
        const mwhProduits = sessionsDuJour.reduce((acc, s) => acc + (s.quantiteProduite ?? 0), 0);

        // Alertes : sources dont le seuil de stock est en statut "ACTIF" (stock bas).
        const alertes = sources.filter(s => s.seuil?.statut === 'ACTIF');

        // On envoie les KPIs (arrondis à 2 décimales) et les listes à la vue.
        res.render('pages/home.twig', {
            title:    'Tableau de bord',
            user:     req.session.user,
            navActive:'home',
            userRole: req.userRole,
            kpis: {
                mwhProduits:    Math.round(mwhProduits * 100) / 100,
                mwhStockes:     Math.round(mwhStockes * 100) / 100,
                caAujourdhui:   Math.round(caAujourdhui * 100) / 100,
                margeAujourdhui: Math.round(margeAujourdhui * 100) / 100,
                sessionsEnCours
            },
            sources, alertes, employes, dernieresVentes, mixObj: mix
        });
    } catch (error) {
        // En cas d'erreur, on affiche quand même le tableau de bord avec des
        // valeurs vides plutôt que de planter, pour ne pas bloquer l'utilisateur.
        console.error(error);
        res.render('pages/home.twig', {
            title: 'Tableau de bord', user: req.session.user,
            navActive: 'home', userRole: req.userRole,
            kpis: { mwhProduits: 0, mwhStockes: 0, caAujourdhui: 0, margeAujourdhui: 0, sessionsEnCours: 0 },
            sources: [], alertes: [], employes: [], dernieresVentes: [], mixObj: null
        });
    }
}
