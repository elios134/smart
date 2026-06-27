/**
 * Contrôleur des ventes d'énergie.
 * Rôle : lister les ventes et leurs indicateurs, afficher le détail d'une vente,
 * enregistrer une nouvelle vente (en diminuant le stock) et supprimer une vente
 * (en restaurant le stock).
 */
import prisma from '../../prisma/prismaClient.js';
import { toInt, toPositiveFloat } from '../services/validators.js';

// GET /ventes
// Affiche la page des ventes : la liste des ventes, les sources actives (pour
// vendre), les clients, et des KPIs (chiffre d'affaires, nombre, panier moyen).
export async function getVentes(req, res) {
    try {
        const [ventes, sources, clients] = await Promise.all([
            prisma.venteEnergie.findMany({
                include: { source: true, tiers: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.sourceEnergie.findMany({ where: { actif: true }, include: { stock: true }, orderBy: { nom: 'asc' } }),
            prisma.tiers.findMany({ where: { typeTiers: 'CLIENT' }, orderBy: { nom: 'asc' } })
        ]);

        const totalCA = ventes.reduce((acc, v) => acc + v.total, 0);
        const kpis = {
            chiffreAffaires: Math.round(totalCA * 100) / 100,
            nbVentes:        ventes.length,
            panierMoyen:     ventes.length > 0 ? Math.round((totalCA / ventes.length) * 100) / 100 : 0,
            // Volume total vendu (somme des quantités) et marge nette (prix encaissé
            // − coût de production de chaque vente). Calculés, jamais stockés.
            volumeVendu:     Math.round(ventes.reduce((acc, v) => acc + v.quantite, 0) * 100) / 100,
            margeNette:      Math.round(ventes.reduce((acc, v) => acc + (v.total - (v.quantite * (v.source?.coutProduction ?? 0))), 0) * 100) / 100
        };

        res.render('pages/ventes.twig', {
            title:    'Ventes d\'énergie',
            user:     req.session.user,
            navActive:'ventes',
            userRole: req.userRole,
            ventes, sources, clients, kpis
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement des ventes');
    }
}

// GET /ventes/:id
// Affiche le détail d'une vente précise (identifiée par son id dans l'URL).
// Redirige avec un message si l'id est invalide ou la vente introuvable.
export async function getVenteDetail(req, res) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.redirect('/ventes?error=Identifiant de vente invalide');

        const vente = await prisma.venteEnergie.findUnique({
            where:   { id },
            include: { source: true, tiers: true }
        });
        if (!vente) return res.redirect('/ventes?error=Vente introuvable');

        res.render('pages/vente-detail.twig', {
            title:    `Vente #${vente.id}`,
            user:     req.session.user,
            navActive:'ventes',
            userRole: req.userRole,
            vente
        });
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors du chargement');
    }
}

// POST /ventes/add
// Enregistre une nouvelle vente et diminue le stock d'autant.
// On valide les données, puis on vérifie qu'il y a assez de stock avant de vendre.
export async function postAddVente(req, res) {
    const { sourceId, tiersId, quantite, prixVente } = req.body;
    try {
        const parsedSourceId = toInt(sourceId);
        if (parsedSourceId === null) return res.redirect('/ventes?error=Source invalide');

        const qty  = toPositiveFloat(quantite);
        const prix = toPositiveFloat(prixVente);
        if (qty === null || qty <= 0) return res.redirect('/ventes?error=La quantité doit être un nombre positif');
        if (prix === null) return res.redirect('/ventes?error=Le prix de vente est invalide');
        const total = Math.round(qty * prix * 100) / 100;

        // Contrôle clé : on refuse la vente si le stock disponible est insuffisant.
        const stock = await prisma.stockEnergie.findUnique({ where: { sourceId: parsedSourceId } });
        if (!stock || stock.quantite < qty) {
            return res.redirect('/ventes?error=Stock insuffisant pour cette vente');
        }

        // Transaction : créer la vente ET décrémenter le stock ensemble (atomique).
        await prisma.$transaction([
            prisma.venteEnergie.create({
                data: { sourceId: parsedSourceId, tiersId: tiersId ? parseInt(tiersId) : null, quantite: qty, prixVente: prix, total }
            }),
            prisma.stockEnergie.update({
                where: { sourceId: parsedSourceId },
                data:  { quantite: { decrement: qty } }
            })
        ]);
        res.redirect('/ventes?success=Vente enregistrée — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors de l\'enregistrement');
    }
}

// POST /ventes/:id/delete
// Supprime une vente et remet la quantité vendue dans le stock (annulation),
// afin que le stock reflète la réalité après suppression.
export async function postDeleteVente(req, res) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.redirect('/ventes?error=Identifiant de vente invalide');

        const vente = await prisma.venteEnergie.findUnique({ where: { id } });
        if (!vente) return res.redirect('/ventes?error=Vente introuvable');

        // Remettre la quantité vendue dans le stock (en transaction avec la suppression).
        await prisma.$transaction([
            prisma.stockEnergie.upsert({
                where:  { sourceId: vente.sourceId },
                update: { quantite: { increment: vente.quantite } },
                create: { sourceId: vente.sourceId, quantite: vente.quantite }
            }),
            prisma.venteEnergie.delete({ where: { id } })
        ]);
        res.redirect('/ventes?success=Vente supprimée — stock restauré');
    } catch (error) {
        console.error(error);
        res.redirect('/ventes?error=Erreur lors de la suppression');
    }
}
