import prisma from "../../prisma/prismaClient.js";

// GET /stock
export async function getStock(req, res) {
    try {
        const [produits, achats, fournisseurs, matieres, liaisons] = await Promise.all([
            prisma.produit.findMany({
                include: { stock: true },
                orderBy: { nom: "asc" }
            }),
            prisma.achatMP.findMany({
                include: {
                    matiere: true,
                    fournisseur: true
                },
                orderBy: { createdAt: "desc" }
            }),
            prisma.fournisseur.findMany({ orderBy: { nom: "asc" } }),
            prisma.matierePremiere.findMany({
                include: { stockMP: true },
                orderBy: { nom: "asc" }
            }),
            // Toutes les liaisons fournisseur ↔ matière
            prisma.fournisseurMatiere.findMany()
        ]);

        // Construire le mapping pour le JS côté client
        // { fournisseurId: [matiereId, ...], ... }
        const fournisseurToMatieres = {};
        const matiereToFournisseurs = {};
        for (const l of liaisons) {
            if (!fournisseurToMatieres[l.fournisseurId]) fournisseurToMatieres[l.fournisseurId] = [];
            fournisseurToMatieres[l.fournisseurId].push(l.matiereId);
            if (!matiereToFournisseurs[l.matiereId]) matiereToFournisseurs[l.matiereId] = [];
            matiereToFournisseurs[l.matiereId].push(l.fournisseurId);
        }

        res.render("pages/stock.twig", {
            title: "Mes Stock",
            navActive: "stock",
            user: req.session.user,
            userRole: req.userRole,
            produits,
            achats,
            matieres,
            fournisseurs,
            fournisseurToMatieres: JSON.stringify(fournisseurToMatieres),
            matiereToFournisseurs: JSON.stringify(matiereToFournisseurs)
        });
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors du chargement du stock");
    }
}

// ═══════════════════════════════════════════════════════
// COMMANDES MP (AchatMP)
// ═══════════════════════════════════════════════════════

// POST /stock/achats/add
export async function postAddAchat(req, res) {
    const { matiereId, quantite, prixUnitaire, fournisseurId, statut, dateLivraison } = req.body;
    try {
        const qte = parseFloat(quantite) || 0;
        const prix = parseFloat(prixUnitaire) || 0;
        await prisma.achatMP.create({
            data: {
                matiereId: parseInt(matiereId),
                quantite: qte,
                prixUnitaire: prix,
                total: qte * prix,
                statut: statut || "EN_ATTENTE",
                dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
                fournisseurId: parseInt(fournisseurId)
            }
        });
        res.redirect("/stock?success=Commande ajoutée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de l'ajout");
    }
}

// POST /stock/achats/:id/livre
export async function postLivreAchat(req, res) {
    const id = parseInt(req.params.id);
    try {
        const achat = await prisma.achatMP.findUnique({ where: { id } });
        if (!achat) return res.redirect("/stock?error=Commande introuvable");

        await prisma.achatMP.update({
            where: { id },
            data: { statut: "LIVRE" }
        });

        // Mettre à jour le stock MP
        await prisma.stockMP.upsert({
            where: { matiereId: achat.matiereId },
            update: { quantite: { increment: achat.quantite } },
            create: { matiereId: achat.matiereId, quantite: achat.quantite }
        });

        res.redirect("/stock?success=Commande marquée comme livrée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la mise à jour");
    }
}

// POST /stock/achats/:id/delete
export async function postDeleteAchat(req, res) {
    try {
        await prisma.achatMP.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect("/stock?success=Commande supprimée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la suppression");
    }
}

// ═══════════════════════════════════════════════════════
// STOCK PRODUITS
// ═══════════════════════════════════════════════════════

// POST /stock/produits/:id/edit
export async function postEditStockProduit(req, res) {
    const id = parseInt(req.params.id);
    const { stockQuantite } = req.body;
    try {
        await prisma.stock.upsert({
            where: { produitId: id },
            update: { quantite: parseFloat(stockQuantite) || 0 },
            create: { produitId: id, quantite: parseFloat(stockQuantite) || 0 }
        });
        res.redirect("/stock?success=Stock mis à jour");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la mise à jour");
    }
}

// POST /stock/produits/:id/delete
export async function postDeleteStockProduit(req, res) {
    const id = parseInt(req.params.id);
    try {
        await prisma.stock.deleteMany({ where: { produitId: id } });
        await prisma.produit.delete({ where: { id } });
        res.redirect("/stock?success=Produit supprimé");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la suppression");
    }
}

// ═══════════════════════════════════════════════════════
// MATIÈRES PREMIÈRES (CRUD)
// ═══════════════════════════════════════════════════════

// POST /stock/matieres/add
export async function postAddMatiere(req, res) {
    const { nom, unite, prixActuel } = req.body;
    try {
        await prisma.matierePremiere.create({
            data: {
                nom,
                unite: unite || "kg",
                prixActuel: parseFloat(prixActuel) || 0
            }
        });
        res.redirect("/stock?success=Matière première ajoutée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de l'ajout de la matière");
    }
}

// POST /stock/matieres/:id/edit
export async function postEditMatiere(req, res) {
    const id = parseInt(req.params.id);
    const { nom, unite, prixActuel } = req.body;
    try {
        await prisma.matierePremiere.update({
            where: { id },
            data: {
                nom,
                unite: unite || "kg",
                prixActuel: parseFloat(prixActuel) || 0
            }
        });
        res.redirect("/stock?success=Matière modifiée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la modification");
    }
}

// POST /stock/matieres/:id/delete
export async function postDeleteMatiere(req, res) {
    const id = parseInt(req.params.id);
    try {
        // Supprimer les dépendances
        await prisma.fournisseurMatiere.deleteMany({ where: { matiereId: id } });
        await prisma.stockMP.deleteMany({ where: { matiereId: id } });
        await prisma.matierePremiere.delete({ where: { id } });
        res.redirect("/stock?success=Matière supprimée");
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors de la suppression (vérifiez qu'il n'y a pas de commandes liées)");
    }
}
