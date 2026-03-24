import prisma from '../../prisma/prismaClient.js';
import { getMixEnergetique } from '../services/energieService.js';

// GET /energie
export async function getEnergie(req, res) {
    try {
        const [sources, productions, ventes, seuils, mix] = await Promise.all([
            prisma.sourceEnergie.findMany({
                include: { stock: true, seuil: true },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.productionEnergie.findMany({
                include: { source: true },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma.venteEnergie.findMany({
                include: { source: true },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma.seuilEnergie.findMany({
                include: { source: true },
                orderBy: { createdAt: 'desc' }
            }),
            getMixEnergetique()
        ]);

        // KPIs stock global
        const stockTotal  = sources.reduce((acc, s) => acc + (s.stock?.quantite ?? 0), 0);
        const caTotal     = ventes.reduce((acc, v) => acc + v.total, 0);
        const prodEnCours = productions.filter(p => p.statut === 'EN_COURS').length;

        // Alertes : sources dont le mix national est sous le seuilArret
        const alertes = sources
            .filter(s => s.seuil && mix && (mix[s.type] ?? 0) < s.seuil.seuilArret)
            .map(s => ({ source: s, mixPct: mix?.[s.type] ?? 0 }));

        res.render('pages/energie.twig', {
            title:      'Énergie',
            user:       req.session.user,
            navActive:  'energie',
            userRole:   req.userRole,
            sources,
            productions,
            ventes,
            seuils,
            mix:        mix ? JSON.stringify(mix) : 'null',
            mixObj:     mix,
            stockTotal: Math.round(stockTotal * 100) / 100,
            caTotal:    Math.round(caTotal * 100) / 100,
            prodEnCours,
            alertes
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur lors du chargement du module énergie');
    }
}

// POST /energie/sources/add
export async function postAddSource(req, res) {
    const { nom, type, coutProduction, couleur } = req.body;
    try {
        await prisma.sourceEnergie.create({
            data: {
                nom,
                type,
                coutProduction: parseFloat(coutProduction) || 0,
                couleur:        couleur || '#4F8AFF'
            }
        });
        res.redirect('/energie?success=Source ajoutée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de l\'ajout de la source');
    }
}

// POST /energie/sources/:id/edit
export async function postEditSource(req, res) {
    const { nom, type, coutProduction, couleur, actif } = req.body;
    try {
        await prisma.sourceEnergie.update({
            where: { id: parseInt(req.params.id) },
            data:  {
                nom,
                type,
                coutProduction: parseFloat(coutProduction) || 0,
                couleur:        couleur || '#4F8AFF',
                actif:          actif === 'on'
            }
        });
        res.redirect('/energie?success=Source modifiée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la modification');
    }
}

// POST /energie/sources/:id/delete
export async function postDeleteSource(req, res) {
    try {
        const id = parseInt(req.params.id);
        await prisma.venteEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.productionEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.stockEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.seuilEnergie.deleteMany({ where: { sourceId: id } });
        await prisma.sourceEnergie.delete({ where: { id } });
        res.redirect('/energie?success=Source supprimée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la suppression');
    }
}

// POST /energie/productions/add
export async function postAddProduction(req, res) {
    const { sourceId, quantite, coutTotal, debutProd, finProd } = req.body;
    try {
        const debut = debutProd ? new Date(debutProd) : new Date();
        const fin   = finProd   ? new Date(finProd)   : null;

        await prisma.productionEnergie.create({
            data: {
                sourceId:      parseInt(sourceId),
                quantite:      parseFloat(quantite) || 0,
                coutTotal:     parseFloat(coutTotal) || 0,
                debutProd:     debut,
                finProd:       fin,
                statut:        fin ? 'TERMINEE' : 'EN_COURS',
                declenchement: 'MANUEL'
            }
        });

        // Si terminée directement, mettre à jour le stock
        if (fin) {
            await prisma.stockEnergie.upsert({
                where:  { sourceId: parseInt(sourceId) },
                update: { quantite: { increment: parseFloat(quantite) || 0 } },
                create: { sourceId: parseInt(sourceId), quantite: parseFloat(quantite) || 0 }
            });
        }

        res.redirect('/energie?success=Production ajoutée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de l\'ajout de la production');
    }
}

// POST /energie/productions/:id/terminer
export async function postTerminerProduction(req, res) {
    try {
        const prod = await prisma.productionEnergie.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!prod) return res.redirect('/energie?error=Production introuvable');

        await prisma.productionEnergie.update({
            where: { id: prod.id },
            data:  { statut: 'TERMINEE', finProd: new Date() }
        });

        await prisma.stockEnergie.upsert({
            where:  { sourceId: prod.sourceId },
            update: { quantite: { increment: prod.quantite } },
            create: { sourceId: prod.sourceId, quantite: prod.quantite }
        });

        res.redirect('/energie?success=Production terminée — stock mis à jour');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la clôture');
    }
}

// POST /energie/productions/:id/delete
export async function postDeleteProduction(req, res) {
    try {
        await prisma.productionEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/energie?success=Production supprimée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la suppression');
    }
}

// POST /energie/ventes/add
export async function postAddVente(req, res) {
    const { sourceId, quantite, prixVente } = req.body;
    try {
        const qty   = parseFloat(quantite) || 0;
        const prix  = parseFloat(prixVente) || 0;
        const total = Math.round(qty * prix * 100) / 100;

        // Vérifier stock suffisant
        const stock = await prisma.stockEnergie.findUnique({
            where: { sourceId: parseInt(sourceId) }
        });
        if (!stock || stock.quantite < qty) {
            return res.redirect('/energie?error=Stock insuffisant pour cette vente');
        }

        await prisma.venteEnergie.create({
            data: { sourceId: parseInt(sourceId), quantite: qty, prixVente: prix, total }
        });

        await prisma.stockEnergie.update({
            where: { sourceId: parseInt(sourceId) },
            data:  { quantite: { decrement: qty } }
        });

        res.redirect('/energie?success=Vente enregistrée');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de l\'enregistrement de la vente');
    }
}

// POST /energie/seuils/save
export async function postSaveSeuil(req, res) {
    const { sourceId, seuilDeclenchement, seuilArret, declenchementAuto, statut } = req.body;
    try {
        await prisma.seuilEnergie.upsert({
            where:  { sourceId: parseInt(sourceId) },
            update: {
                seuilDeclenchement: parseFloat(seuilDeclenchement) || 20,
                seuilArret:         parseFloat(seuilArret) || 10,
                declenchementAuto:  declenchementAuto === 'on',
                statut:             statut || 'ACTIF'
            },
            create: {
                sourceId:           parseInt(sourceId),
                seuilDeclenchement: parseFloat(seuilDeclenchement) || 20,
                seuilArret:         parseFloat(seuilArret) || 10,
                declenchementAuto:  declenchementAuto === 'on',
                statut:             statut || 'ACTIF'
            }
        });
        res.redirect('/energie?success=Seuil configuré');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la configuration du seuil');
    }
}

// POST /energie/seuils/:id/delete
export async function postDeleteSeuil(req, res) {
    try {
        await prisma.seuilEnergie.delete({ where: { id: parseInt(req.params.id) } });
        res.redirect('/energie?success=Seuil supprimé');
    } catch (error) {
        console.error(error);
        res.redirect('/energie?error=Erreur lors de la suppression du seuil');
    }
}
