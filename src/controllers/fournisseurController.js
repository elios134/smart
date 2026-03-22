import prisma from "../../prisma/prismaClient.js";

// GET /fournisseurs
export async function getFournisseurs(req, res) {
    try {
        const [fournisseurs, matieres] = await Promise.all([
            prisma.fournisseur.findMany({
                include: {
                    achats: true,
                    matieres: { include: { matiere: true } }
                },
                orderBy: { nom: "asc" }
            }),
            prisma.matierePremiere.findMany({ orderBy: { nom: "asc" } })
        ]);

        const fournisseursAvecStats = fournisseurs.map(f => ({
            ...f,
            nbCommandes: f.achats.length,
            dernierAchat: f.achats.length > 0
                ? f.achats
                    .filter(a => a.dateLivraison)
                    .sort((a, b) => new Date(b.dateLivraison) - new Date(a.dateLivraison))[0]?.dateLivraison ?? null
                : null,
            // IDs des matières liées (pour pré-cocher dans la modale edit)
            matiereIds: f.matieres.map(fm => fm.matiereId),
            matieresNoms: f.matieres.map(fm => fm.matiere.nom).join(", ")
        }));

        res.render("pages/fournisseurs.twig", {
            title: "Gestion des Fournisseurs",
            user: req.session.user,
            navActive: "stock",
            userRole: req.userRole,
            fournisseurs: fournisseursAvecStats,
            matieres
        });
    } catch (error) {
        console.error(error);
        res.redirect("/stock?error=Erreur lors du chargement des fournisseurs");
    }
}

// POST /fournisseurs/add
export async function postAddFournisseur(req, res) {
    const { nom, nomContact, fonctionContact, email, telephone, delaiLivraison, notes } = req.body;
    // matiereIds peut être un string (1 seul) ou un array (plusieurs)
    let matiereIds = req.body.matiereIds || [];
    if (!Array.isArray(matiereIds)) matiereIds = [matiereIds];

    try {
        const fournisseur = await prisma.fournisseur.create({
            data: {
                nom,
                nomContact: nomContact || "",
                fonctionContact: fonctionContact || null,
                email,
                telephone: telephone || "",
                delaiLivraison: parseInt(delaiLivraison) || 0,
                notes: notes || null
            }
        });

        // Créer les liaisons matières
        if (matiereIds.length > 0) {
            await prisma.fournisseurMatiere.createMany({
                data: matiereIds.map(id => ({
                    fournisseurId: fournisseur.id,
                    matiereId: parseInt(id)
                }))
            });
        }

        res.redirect("/fournisseurs?success=Fournisseur ajouté");
    } catch (error) {
        console.error(error);
        res.redirect("/fournisseurs?error=Erreur lors de l'ajout");
    }
}

// POST /fournisseurs/:id/edit
export async function postEditFournisseur(req, res) {
    const id = parseInt(req.params.id);
    const { nom, nomContact, fonctionContact, email, telephone, delaiLivraison, notes } = req.body;
    let matiereIds = req.body.matiereIds || [];
    if (!Array.isArray(matiereIds)) matiereIds = [matiereIds];

    try {
        await prisma.fournisseur.update({
            where: { id },
            data: {
                nom,
                nomContact: nomContact || "",
                fonctionContact: fonctionContact || null,
                email,
                telephone: telephone || "",
                delaiLivraison: parseInt(delaiLivraison) || 0,
                notes: notes || null
            }
        });

        // Recréer les liaisons : supprimer les anciennes puis insérer les nouvelles
        await prisma.fournisseurMatiere.deleteMany({ where: { fournisseurId: id } });
        if (matiereIds.length > 0) {
            await prisma.fournisseurMatiere.createMany({
                data: matiereIds.map(mid => ({
                    fournisseurId: id,
                    matiereId: parseInt(mid)
                }))
            });
        }

        res.redirect("/fournisseurs?success=Fournisseur modifié");
    } catch (error) {
        console.error(error);
        res.redirect("/fournisseurs?error=Erreur lors de la modification");
    }
}

// POST /fournisseurs/:id/delete
export async function postDeleteFournisseur(req, res) {
    try {
        // Les liaisons FournisseurMatiere se suppriment en cascade (onDelete: Cascade)
        await prisma.fournisseur.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect("/fournisseurs?success=Fournisseur supprimé");
    } catch (error) {
        console.error(error);
        res.redirect("/fournisseurs?error=Erreur lors de la suppression");
    }
}
