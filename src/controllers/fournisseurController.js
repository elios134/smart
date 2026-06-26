/**
 * Contrôleur des "tiers" (fournisseurs et clients).
 * Rôle : gérer le CRUD (lister, ajouter, modifier, supprimer) des partenaires
 * commerciaux stockés dans la table `tiers`.
 */
import prisma from '../../prisma/prismaClient.js';
import { toInt, isOneOf, TYPES_TIERS } from '../services/validators.js';

// Normalise les champs d'un tiers (factorisé entre add et edit)
// Reçoit le corps du formulaire (req.body) et renvoie un objet propre :
// champs nettoyés (trim), valeurs par défaut et conversions (ex. délai en entier).
function buildTiersData(body) {
    return {
        nom:             (body.nom || '').trim(),
        typeTiers:       isOneOf(body.typeTiers, TYPES_TIERS) ? body.typeTiers : 'FOURNISSEUR',
        nomContact:      body.nomContact || null,
        fonctionContact: body.fonctionContact || null,
        mail:            body.mail || null,
        telephone:       body.telephone || null,
        delaiLivraison:  body.delaiLivraison ? toInt(body.delaiLivraison) : null,
        notes:           body.notes || null
    };
}

// GET /fournisseurs
// Récupère tous les tiers (triés par nom) et affiche la page de gestion.
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
// Crée un nouveau tiers à partir des données du formulaire.
// Le nom est obligatoire : sans lui on redirige avec un message d'erreur.
export async function postAddFournisseur(req, res) {
    try {
        const data = buildTiersData(req.body);
        if (!data.nom) return res.redirect('/fournisseurs?error=Le nom est requis');

        await prisma.tiers.create({ data });
        res.redirect('/fournisseurs?success=Ajouté avec succès');
    } catch (error) {
        console.error(error);
        res.redirect('/fournisseurs?error=Erreur lors de l\'ajout');
    }
}

// POST /fournisseurs/:id/edit
// Met à jour un tiers existant identifié par son id (dans l'URL).
// On vérifie que l'id est un entier valide et que le nom est rempli.
export async function postEditFournisseur(req, res) {
    try {
        const id = toInt(req.params.id);
        if (id === null) return res.redirect('/fournisseurs?error=Identifiant invalide');

        const data = buildTiersData(req.body);
        if (!data.nom) return res.redirect('/fournisseurs?error=Le nom est requis');

        await prisma.tiers.update({ where: { id }, data });
        res.redirect('/fournisseurs?success=Modifié avec succès');
    } catch (error) {
        console.error(error);
        res.redirect('/fournisseurs?error=Erreur lors de la modification');
    }
}

// POST /fournisseurs/:id/delete
// Supprime un tiers. Avant de l'effacer, on "détache" ses achats et ventes
// pour ne pas perdre ces opérations ni provoquer une erreur de clé étrangère.
export async function postDeleteFournisseur(req, res) {
    try {
        const id = toInt(req.params.id);
        if (id === null) return res.redirect('/fournisseurs?error=Identifiant invalide');
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
