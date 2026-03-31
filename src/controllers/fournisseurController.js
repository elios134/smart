import prisma from '../../prisma/prismaClient.js';

// GET /fournisseurs
export async function getFournisseurs(req, res) {
    try {
        const fournisseurs = await prisma.tiers.findMany({ orderBy: { nom: 'asc' } });
        res.render('pages/fournisseurs.twig', {
            title:     'Fournisseurs & Clients',
            user:      req.session.user,
            navActive: 'fournisseurs',
            userRole:  req.userRole,
            fournisseurs
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement');
    }
}

// POST /fournisseurs/add
export async function postAddFournisseur(req, res) {
    const { nom, typeTiers, nomContact, fonctionContact, mail, telephone, delaiLivraison, notes } = req.body;
    try {
        await prisma.tiers.create({
            data: {
                nom, typeTiers: typeTiers || 'FOURNISSEUR',
                nomContact: nomContact || null, fonctionContact: fonctionContact || null,
                mail: mail || null, telephone: telephone || null,
                delaiLivraison: delaiLivraison ? parseInt(delaiLivraison) : null,
                notes: notes || null
            }
        });
        res.redirect('/fournisseurs?success=Ajouté avec succès');
    } catch (error) {
        console.error(error);
        res.redirect('/fournisseurs?error=Erreur lors de l\'ajout');
    }
}

// POST /fournisseurs/:id/edit
export async function postEditFournisseur(req, res) {
    const { nom, typeTiers, nomContact, fonctionContact, mail, telephone, delaiLivraison, notes } = req.body;
    try {
        await prisma.tiers.update({
            where: { id: parseInt(req.params.id) },
            data: {
                nom, typeTiers: typeTiers || 'FOURNISSEUR',
                nomContact: nomContact || null, fonctionContact: fonctionContact || null,
                mail: mail || null, telephone: telephone || null,
                delaiLivraison: delaiLivraison ? parseInt(delaiLivraison) : null,
                notes: notes || null
            }
        });
        res.redirect('/fournisseurs?success=Modifié avec succès');
    } catch (error) {
        console.error(error);
        res.redirect('/fournisseurs?error=Erreur lors de la modification');
    }
}

// POST /fournisseurs/:id/delete
export async function postDeleteFournisseur(req, res) {
    try {
        const id = parseInt(req.params.id);
        // Détacher les achats et ventes liés avant suppression (tiersId nullable)
        await prisma.achatEnergie.updateMany({ where: { tiersId: id }, data: { tiersId: null } });
        await prisma.venteEnergie.updateMany({ where: { tiersId: id }, data: { tiersId: null } });
        await prisma.tiers.delete({ where: { id } });
        res.redirect('/fournisseurs?success=Supprimé');
    } catch (error) {
        console.error(error);
        res.redirect('/fournisseurs?error=Erreur lors de la suppression');
    }
}
