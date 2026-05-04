import prisma from "../../prisma/prismaClient.js";

// GET /production
export async function getProduction(req, res) {
    try {
        const productions = await prisma.production.findMany({
            include: {
                produit:       true,
                machine:       true,
                consommations: { include: { matiere: true } }
            },
            orderBy: { createdAt: "desc" }
        });

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
        const debut = debutFab ? new Date(debutFab) : new Date();
        const fin   = finFab   ? new Date(finFab)   : new Date(debut.getTime() + 86400000);
        const qty   = parseFloat(quantite) || 0;

        // Transaction interactive pour garantir la cohérence Produit <-> StockMP <-> Production
        await prisma.$transaction(async (tx) => {
            let produit = await tx.produit.findFirst({ 
                where: { nom },
                include: { nomenclatures: true } // On récupère la recette
            });
            
            if (!produit) {
                produit = await tx.produit.create({
                    data: { nom, coutActuel: parseFloat(coutFab) || 0 },
                    include: { nomenclatures: true }
                });
            }

            // Vérification et déduction des stocks de Matières Premières
            const consommationsData = [];
            if (produit.nomenclatures && produit.nomenclatures.length > 0) {
                for (const item of produit.nomenclatures) {
                    const quantiteRequise = item.quantite * qty;
                    
                    const stockMP = await tx.stockMP.findUnique({ where: { matiereId: item.matiereId } });
                    if (!stockMP || stockMP.quantite < quantiteRequise) {
                        throw new Error(`Stock insuffisant. Requis: ${quantiteRequise}, Disponible: ${stockMP ? stockMP.quantite : 0}`);
                    }

                    // Déduction atomique du stock
                    await tx.stockMP.update({
                        where: { matiereId: item.matiereId },
                        data: { quantite: { decrement: quantiteRequise } }
                    });

                    // Préparation des lignes de consommation
                    consommationsData.push({ matiereId: item.matiereId, quantite: quantiteRequise });
                }
            }

            // Création de la production et de ses consommations associées
            await tx.production.create({
                data: {
                    produitId: produit.id,
                    quantite:  qty,
                    coutFab:   parseFloat(coutFab)  || 0,
                    debutFab:  debut,
                    finFab:    fin,
                    statut:    statut || "EN_ATTENTE",
                    consommations: consommationsData.length > 0 ? { create: consommationsData } : undefined
                }
            });
        });

        res.redirect("/production?success=Production ajoutée");
    } catch (error) {
        console.error(error);
        // Remonter l'erreur spécifique de stock à l'utilisateur
        const msg = error.message.includes("Stock insuffisant") ? error.message : "Erreur lors de l'ajout";
        res.redirect(`/production?error=${encodeURIComponent(msg)}`);
    }
}

// POST /production/:id/delete
export async function postDeleteProduction(req, res) {
    try {
        const id = parseInt(req.params.id);
        // Exécution en lot (batch) : soit les deux réussissent, soit aucune
        await prisma.$transaction([
            prisma.consommationMP.deleteMany({ where: { productionId: id } }),
            prisma.production.delete({ where: { id } })
        ]);
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

        // Exécution en lot (batch)
        await prisma.$transaction([
            prisma.production.update({
                where: { id: prod.id },
                data:  { statut: "TERMINEE", finFab: new Date() }
            }),
            prisma.stock.upsert({
                where:  { produitId: prod.produitId },
                update: { quantite: { increment: prod.quantite } },
                create: { produitId: prod.produitId, quantite: prod.quantite }
            })
        ]);

        res.redirect("/production?success=Production terminée — stock mis à jour");
    } catch (error) {
        console.error(error);
        res.redirect("/production?error=Erreur lors de la clôture");
    }
}