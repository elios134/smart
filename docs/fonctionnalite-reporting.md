# 📊 Reporting : transformer les données brutes en graphiques et exports

> **Une fonctionnalité visuelle et concrète de Smart-Yield.**
> L'application prend toutes les ventes et les productions enregistrées, les **range
> jour par jour**, les affiche sous forme de **graphique**, et permet de les
> **télécharger** en fichier Excel (CSV) ou en PDF imprimable.

Fichiers principaux : `src/controllers/reportingController.js` (côté serveur)
et `public/script/reporting.js` (côté affichage).

---

## 1. L'idée en une phrase

Au fil du temps, l'application accumule des centaines de lignes : « telle vente, tel
jour, tel montant », « telle production, tel jour, tel coût ». Prises une par une,
ces lignes ne parlent à personne. Le reporting les **regroupe par journée** pour
répondre à des questions simples : *Combien ai-je gagné cette semaine ? Mes coûts
augmentent-ils ?* Le résultat est présenté en **graphique** et peut être **exporté**
pour être archivé ou partagé.

```
   Toutes les ventes + toutes les productions
                  │
                  ▼
        ┌──────────────────────┐     ──►  Graphique (7 / 30 / 90 jours)
        │  on regroupe par jour │     ──►  Export Excel (CSV)
        │  et on additionne     │     ──►  Export PDF (impression)
        └──────────────────────┘
```

---

## 2. Regrouper les chiffres jour par jour

Le cœur de la fonctionnalité est une fonction qui prend la liste des ventes et des
productions, et construit **trois listes alignées** : les dates, le chiffre d'affaires
de chaque jour, et les coûts de chaque jour.

```js
function buildChartData(ventes, sessions, days) {
    const labels = [], caMap = {}, coutMap = {};

    // 1) On prépare une "case vide" pour chaque jour de la période (ex: 7 derniers jours)
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        labels.push(key); caMap[key] = 0; coutMap[key] = 0;   // ex: "05/06" → 0 €
    }

    // 2) Pour chaque vente, on l'ajoute dans la case du bon jour
    ventes.forEach(v => {
        const k = new Date(v.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
        if (caMap[k] !== undefined) caMap[k] += v.total ?? 0;
    });

    // 3) Idem pour les coûts de production
    sessions.forEach(s => {
        const k = new Date(s.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
        if (coutMap[k] !== undefined) coutMap[k] += s.coutTotal ?? 0;
    });

    return { labels, ca: labels.map(l => caMap[l]), couts: labels.map(l => coutMap[l]) };
}
```

**À expliquer simplement :** imaginez une rangée de **boîtes étiquetées par date**.
On crée d'abord une boîte vide par jour, puis on glisse chaque vente dans la boîte du
jour correspondant et on fait la somme. À la fin, chaque boîte contient le total de la
journée — prêt à être dessiné en graphique.

On fait ce calcul pour **trois durées** d'un coup (7, 30 et 90 jours), pour que
l'utilisateur puisse basculer instantanément d'une vue à l'autre :

```js
const chartData = {
    '7':  buildChartData(ventes, sessions, 7),
    '30': buildChartData(ventes, sessions, 30),
    '90': buildChartData(ventes, sessions, 90)
};
```

---

## 3. Aller chercher toutes les données en même temps

Pour construire le rapport, on a besoin de plusieurs informations : les ventes, les
productions, les sources et les seuils. Plutôt que de les demander à la base **l'une
après l'autre** (lent), on les demande **toutes en parallèle**.

```js
const [ventes, sessions, sources, seuils] = await Promise.all([
    prisma.venteEnergie.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.sessionEnergie.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.sourceEnergie.findMany({ include: { stock: true }, orderBy: { nom: 'asc' } }),
    prisma.seuilEnergie.findMany({ include: { source: true } })
]);
```

**À expliquer simplement :** `Promise.all` revient à **envoyer quatre coursiers en
même temps** chercher quatre colis, au lieu d'attendre le retour de chacun avant
d'envoyer le suivant. La page se charge nettement plus vite.

---

## 4. La barre de « niveau de stock » (indicateur visuel)

Pour chaque source, on calcule à quel point le stock est proche du seuil souhaité,
exprimé en **pourcentage** (de 0 à 100 %). C'est ce qui alimente les jauges colorées.

```js
const besoins = sources.map(s => {
    const stock    = s.stock?.quantite ?? 0;          // ce qu'on a en réserve
    const seuil    = seuils.find(sl => sl.sourceId === s.id);
    const seuilVal = seuil?.seuilDeclenchement ?? 0;  // l'objectif à atteindre
    const pct      = seuilVal > 0 ? Math.min(100, Math.round((stock / seuilVal) * 100)) : 100;
    return { ...s, stock, seuilVal, pct };
});
```

**À expliquer simplement :** c'est comme une **jauge d'essence**. Si l'objectif est
de 50 MWh et qu'on en a 25, la jauge affiche 50 %. Le `Math.min(100, ...)` empêche
simplement la jauge de dépasser le plein.

---

## 5. Le graphique côté écran (Chart.js)

Les chiffres calculés au point 2 sont envoyés à la page, puis dessinés avec la
librairie **Chart.js** : les ventes en **barres bleues**, les coûts en **ligne verte
pointillée**. Quand l'utilisateur clique sur « 30 jours », on remplace simplement les
données et on redessine.

```js
document.querySelectorAll('.period-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        // bouton actif visuellement
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // on recharge les données de la période choisie (7, 30 ou 90)
        var next = buildDatasets(btn.dataset.period);
        chart.data.labels = next.labels;
        chart.data.datasets = next.datasets;
        chart.update();          // on redessine le graphique
    });
});
```

**À expliquer simplement :** le graphique est déjà à l'écran ; changer de période ne
recharge **pas** toute la page. On échange juste les chiffres affichés et le dessin se
met à jour instantanément, comme si on tournait un bouton.

---

## 6. Exporter en Excel (fichier CSV)

L'utilisateur peut télécharger toutes les lignes dans un fichier ouvrable avec Excel
ou LibreOffice. Un fichier CSV, c'est simplement du texte où les colonnes sont
séparées par des virgules.

```js
const lines = ['Type,Date,Source,Quantite,Prix,Total'];   // la ligne d'en-tête
for (const v of ventes) {
    const date = new Date(v.createdAt).toLocaleDateString('fr-FR');
    lines.push(`Vente,${date},${v.source?.nom ?? ''},${v.quantite},${v.prixVente},${v.total}`);
}

res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', `attachment; filename="reporting-2026-06-05.csv"`);
res.send('﻿' + lines.join('\r\n'));   // ﻿ = astuce pour les accents dans Excel
```

**À expliquer simplement :**
- On écrit une ligne de texte par vente, comme un tableau dont les cases sont séparées
  par des virgules.
- `Content-Disposition: attachment` dit au navigateur : « ne l'affiche pas, **propose
  de le télécharger** ».
- Le petit `﻿` au début est une astuce indispensable pour qu'Excel affiche
  correctement les **accents** (é, è, à…) sans caractères bizarres.

---

## 7. Exporter en PDF (version imprimable)

Pour le PDF, on ne génère pas un fichier compliqué : on prépare une **page épurée
dédiée à l'impression** (totaux, tableaux), et on laisse la fonction « Imprimer →
Enregistrer en PDF » du navigateur faire le reste.

```js
const totalCA    = ventes.reduce((sum, v) => sum + (v.total ?? 0), 0);
const totalCouts = sessions.reduce((sum, s) => sum + (s.coutTotal ?? 0), 0);

res.render('pages/reporting-print.twig', {
    ventes, sessions, besoins, totalCA, totalCouts,
    dateExport: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
});
```

**À expliquer simplement :** `reduce` parcourt toutes les ventes et **fait le total**,
comme une calculatrice qui additionne la pile de tickets. On envoie ensuite ces totaux
vers une page volontairement sobre, pensée pour le papier.

---

## 8. Ce qu'il faut retenir (points à valoriser à l'oral)

| Compétence démontrée | Où, dans le code |
|---|---|
| **Agrégation de données** (regrouper et additionner par jour) | `buildChartData()` |
| **Optimisation** (requêtes en parallèle) | `Promise.all([...])` |
| **Calcul d'indicateurs** (pourcentage de stock, jauges) | `besoins.map(...)` |
| **Visualisation de données** (graphique interactif) | `reporting.js` / Chart.js |
| **Export de fichiers** (CSV compatible Excel, en-têtes HTTP) | `exportCSV()` |
| **Génération d'un document imprimable** (PDF via le navigateur) | `exportPDF()` |

> **Phrase de conclusion possible :** « Le reporting donne du sens aux données
> accumulées par Smart-Yield : il les regroupe, les met en image et permet de les
> partager. L'exploitant passe ainsi d'une simple liste d'opérations à une véritable
> **vision d'ensemble de son activité**, consultable à l'écran comme sur papier. »
