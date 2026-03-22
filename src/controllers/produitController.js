import prisma from "../../prisma/prismaClient.js";

// GET /produits
export async function getProduits(req, res) {
    try {
        const produits = await prisma.produit.findMany({
            include: { stock: true },
            orderBy: { nom: "asc" }
        });

        res.render("pages/produits.twig", {
            title: "Produits",
            user: req.session.user,
            navActive: "produits",
            userRole: req.userRole,
            produits
        });
    } catch (error) {
        console.error(error);
        res.redirect("/home?error=Erreur lors du chargement des produits");
    }
}

// POST /produits/add
export async function postAddProduit(req, res) {
    const { nom, coutActuel, seuilBas, seuilHaut, stock, prixVente, statut } = req.body;
    try {
        const produit = await prisma.produit.create({
            data: {
                nom,
                coutActuel: parseFloat(coutActuel) || 0,
                seuilBas:   parseFloat(seuilBas)   || 0,
                seuilHaut:  parseFloat(seuilHaut)  || 0,
                prixVente:  parseFloat(prixVente)  || 0,
                statut:     statut || "EN_ATTENTE",
                stock: {
                    create: { quantite: parseFloat(stock) || 0 }
                }
            }
        });
        res.redirect("/produits?success=Produit ajouté");
    } catch (error) {
        console.error(error);
        res.redirect("/produits?error=Erreur lors de l'ajout");
    }
}

// POST /produits/:id/edit
export async function postEditProduit(req, res) {
    const { nom, coutActuel, seuilBas, seuilHaut, stock, prixVente, statut } = req.body;
    const id = parseInt(req.params.id);
    try {
        await prisma.produit.update({
            where: { id },
            data: {
                nom,
                coutActuel: parseFloat(coutActuel) || 0,
                seuilBas:   parseFloat(seuilBas)   || 0,
                seuilHaut:  parseFloat(seuilHaut)  || 0,
                prixVente:  parseFloat(prixVente)  || 0,
                statut:     statut || "EN_ATTENTE",
            }
        });
        await prisma.stock.upsert({
            where:  { produitId: id },
            update: { quantite: parseFloat(stock) || 0 },
            create: { produitId: id, quantite: parseFloat(stock) || 0 }
        });
        res.redirect("/produits?success=Produit modifié");
    } catch (error) {
        console.error(error);
        res.redirect("/produits?error=Erreur lors de la modification");
    }
}

// POST /produits/:id/delete
export async function postDeleteProduit(req, res) {
    const id = parseInt(req.params.id);
    try {
        await prisma.stock.deleteMany({ where: { produitId: id } });
        await prisma.produit.delete({ where: { id } });
        res.redirect("/produits?success=Produit supprimé");
    } catch (error) {
        console.error(error);
        res.redirect("/produits?error=Erreur lors de la suppression");
    }
}
