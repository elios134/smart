import prisma from "../../prisma/prismaClient.js";

// GET /ventes
export async function getVentes(req, res) {
    try {
        const [ventes, produits] = await Promise.all([
            prisma.vente.findMany({
                include: { lignes: { include: { produit: true } } },
                orderBy: { createdAt: "desc" }
            }),
            prisma.produit.findMany({
                include: { stock: true },
                orderBy: { nom: "asc" }
            })
        ]);

        // Calcul qteTotale côté JS
        const ventesAvecQte = ventes.map(v => ({
            ...v,
            qteTotale: v.lignes.reduce((s, l) => s + l.quantite, 0)
        }));

        // KPIs
        const chiffreAffaires = ventes.reduce((sum, v) => sum + (v.totalTTC ?? 0), 0);
        const nbVentes        = ventes.length;
        const panierMoyen     = nbVentes > 0 ? Math.round(chiffreAffaires / nbVentes) : 0;

        res.render("pages/ventes.twig", {
            title: "Mes Ventes",
            user: req.session.user,
            navActive: "ventes",
            userRole: req.userRole,
            ventes: ventesAvecQte,
            produits,
            kpis: { chiffreAffaires, nbVentes, panierMoyen }
        });
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors du chargement des ventes");
    }
}

// POST /ventes/add
export async function postAddVente(req, res) {
    const { produitId, quantite } = req.body;
    try {
        const produit = await prisma.produit.findUnique({
            where: { id: parseInt(produitId) }
        });
        if (!produit) return res.redirect("/ventes?error=Produit introuvable");

        const qte      = parseFloat(quantite) || 0;
        const prixHT   = produit.prixVente * qte;
        const tauxTVA  = 20;
        const totalTTC = prixHT * (1 + tauxTVA / 100);

        // Numéro de commande unique
        const numeroCommande = "CMD-" + Date.now();

        await prisma.vente.create({
            data: {
                numeroCommande,
                totalHT: prixHT,
                tva: tauxTVA,
                totalTTC,
                statut: "EN_COURS",
                lignes: {
                    create: [{
                        produitId: produit.id,
                        quantite: qte,
                        prixUnitaire: produit.prixVente,
                        prixHT
                    }]
                }
            }
        });

        // Décrémenter le stock produit
        await prisma.stock.upsert({
            where:  { produitId: produit.id },
            update: { quantite: { decrement: qte } },
            create: { produitId: produit.id, quantite: 0 }
        });

        res.redirect("/ventes?success=Vente créée");
    } catch (error) {
        console.error(error);
        res.redirect("/ventes?error=Erreur lors de la création");
    }
}

// GET /ventes/:id
export async function getVenteDetail(req, res) {
    try {
        const vente = await prisma.vente.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { lignes: { include: { produit: true } } }
        });
        if (!vente) return res.redirect("/ventes?error=Vente introuvable");

        const montantTVA = vente.totalTTC - vente.totalHT;

        res.render("pages/vente-detail.twig", {
            title: "Détails commande",
            user: req.session.user,
            navActive: "ventes",
            userRole: req.userRole,
            vente,
            montantTVA
        });
    } catch (error) {
        console.error(error);
        res.redirect("/ventes?error=Erreur lors du chargement");
    }
}

// POST /ventes/:id/delete
export async function postDeleteVente(req, res) {
    try {
        await prisma.ligneVente.deleteMany({ where: { venteId: parseInt(req.params.id) } });
        await prisma.vente.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect("/ventes?success=Vente supprimée");
    } catch (error) {
        console.error(error);
        res.redirect("/ventes?error=Erreur lors de la suppression");
    }
}
