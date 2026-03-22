import prisma from "../../prisma/prismaClient.js";
import { getCoursMatieres } from "../services/commoditiesService.js";

// GET /production
export async function getProduction(req, res) {
    try {
        const [productions, coursMatieres, matieresDB] = await Promise.all([
            prisma.production.findMany({
                include: {
                    produit:       true,
                    machine:       true,
                    consommations: { include: { matiere: true } }
                },
                orderBy: { createdAt: "desc" }
            }),
            getCoursMatieres(),
            // matieresDB = pour le select de la modale ajout
            prisma.matierePremiere.findMany({
                include: { stockMP: true },
                orderBy: { nom: "asc" }
            })
        ]);

        const alertesAchat = matieresDB.filter(m =>
            m.seuilAchat > 0 && (m.stockMP?.quantite ?? 0) <= m.seuilAchat
        );
        const alertesVente = matieresDB.filter(m =>
            m.seuilVente > 0 && (m.stockMP?.quantite ?? 0) >= m.seuilVente
        );

        const eventsCalendar = productions.map(p => ({
            id:    p.id,
            title: p.produit?.nom ?? "Production",
            start: p.debutFab,
            end:   p.finFab,
            color: p.statut === "EN_COURS" ? "#4F8AFF"
                 : p.statut === "TERMINEE" ? "#2FEEA8"
                 : "#5A6380"
        }));

        res.render("pages/production.twig", {
            title:          "Mes Productions",
            user:           req.session.user,
            navActive:      "production",
            userRole:       req.userRole,
            productions,
            coursMatieres,   // tableau cours API → onglet Cours MP
            matieres:        matieresDB, // matières DB → select modale
            alertesAchat,
            alertesVente,
            eventsCalendar:  JSON.stringify(eventsCalendar)
        });
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors du chargement des productions");
    }
}

// POST /production/add
export async function postAddProduction(req, res) {
    const { nom, quantite, coutFab, debutFab, finFab, statut } = req.body;
    try {
        let produit = await prisma.produit.findFirst({ where: { nom } });
        if (!produit) {
            produit = await prisma.produit.create({
                data: { nom, coutActuel: parseFloat(coutFab) || 0 }
            });
        }

        const debut = debutFab ? new Date(debutFab) : new Date();
        const fin   = finFab   ? new Date(finFab)   : new Date(debut.getTime() + 86400000);

        await prisma.production.create({
            data: {
                produitId: produit.id,
                quantite:  parseFloat(quantite) || 0,
                coutFab:   parseFloat(coutFab)  || 0,
                debutFab:  debut,
                finFab:    fin,
                statut:    statut || "EN_ATTENTE"
            }
        });

        res.redirect("/production?success=Production ajoutée");
    } catch (error) {
        console.error(error);
        res.redirect("/production?error=Erreur lors de l'ajout");
    }
}

// POST /production/:id/delete
export async function postDeleteProduction(req, res) {
    try {
        await prisma.consommationMP.deleteMany({ where: { productionId: parseInt(req.params.id) } });
        await prisma.production.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect("/production?success=Production supprimée");
    } catch (error) {
        console.error(error);
        res.redirect("/production?error=Erreur lors de la suppression");
    }
}

// POST /production/:id/lancer
export async function postLancerProduction(req, res) {
    try {
        await prisma.production.update({
            where: { id: parseInt(req.params.id) },
            data:  { statut: "EN_COURS", debutFab: new Date() }
        });
        res.redirect("/production?success=Production lancée");
    } catch (error) {
        console.error(error);
        res.redirect("/production?error=Erreur lors du lancement");
    }
}

// POST /production/:id/terminer
export async function postTerminerProduction(req, res) {
    try {
        const prod = await prisma.production.findUnique({ where: { id: parseInt(req.params.id) } });
        if (!prod) return res.redirect("/production?error=Production introuvable");

        await prisma.production.update({
            where: { id: prod.id },
            data:  { statut: "TERMINEE", finFab: new Date() }
        });

        await prisma.stock.upsert({
            where:  { produitId: prod.produitId },
            update: { quantite: { increment: prod.quantite } },
            create: { produitId: prod.produitId, quantite: prod.quantite }
        });

        res.redirect("/production?success=Production terminée — stock mis à jour");
    } catch (error) {
        console.error(error);
        res.redirect("/production?error=Erreur lors de la clôture");
    }
}