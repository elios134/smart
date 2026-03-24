import prisma from '../../prisma/prismaClient.js';

function buildChartData(ventes, sessions, days) {
    const labels = [], caMap = {}, coutMap = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        labels.push(key); caMap[key] = 0; coutMap[key] = 0;
    }
    ventes.forEach(v => { const k = new Date(v.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }); if (caMap[k] !== undefined) caMap[k] += v.total ?? 0; });
    sessions.forEach(s => { const k = new Date(s.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }); if (coutMap[k] !== undefined) coutMap[k] += s.coutTotal ?? 0; });
    return { labels, ca: labels.map(l => Math.round(caMap[l])), couts: labels.map(l => Math.round(coutMap[l])) };
}

// GET /reporting
export async function getReporting(req, res) {
    try {
        const [ventes, sessions, sources, seuils] = await Promise.all([
            prisma.venteEnergie.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.sessionEnergie.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.sourceEnergie.findMany({ include: { stock: true }, orderBy: { nom: 'asc' } }),
            prisma.seuilEnergie.findMany({ include: { source: true } })
        ]);

        const chartData = {
            '7':  buildChartData(ventes, sessions, 7),
            '30': buildChartData(ventes, sessions, 30),
            '90': buildChartData(ventes, sessions, 90)
        };

        const besoins = sources.map(s => {
            const stock    = s.stock?.quantite ?? 0;
            const seuil    = seuils.find(sl => sl.sourceId === s.id);
            const seuilVal = seuil?.seuilDeclenchement ?? 0;
            const pct      = seuilVal > 0 ? Math.min(100, Math.round((stock / seuilVal) * 100)) : 100;
            return { ...s, stock, seuilVal, pct };
        });

        res.render('pages/reporting.twig', {
            title: 'Reporting', user: req.session.user, navActive: 'reporting', userRole: req.userRole,
            chartData: JSON.stringify(chartData), besoins, seuils, sources
        });
    } catch (error) {
        console.error(error);
        res.redirect('/home?error=Erreur chargement reporting');
    }
}
