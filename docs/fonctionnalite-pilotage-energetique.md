# ⚡ Pilotage énergétique automatique en temps réel

> **La fonctionnalité phare de Smart-Yield.**
> L'application décide **toute seule** de produire ou de vendre de l'énergie, en fonction
> de l'état réel du réseau électrique français récupéré en direct.

Fichier principal : `src/services/energieService.js`
Déclencheur : `server.js`

---

## 1. L'idée en une phrase

Chaque heure, l'application regarde **d'où vient l'électricité en France** (combien d'éolien,
de solaire, etc.) grâce à une API publique. Si une source d'énergie est très présente sur le
réseau, on **lance la production** ; si elle devient rare, on **clôture et on vend** le stock.
Le tout **sans intervention humaine**.

```
   API ENTSO-E (réseau français)
            │  (mix : éolien 35%, solaire 12%, ...)
            ▼
   ┌────────────────────┐     mix ≥ seuil ?  ──► démarrer la production
   │  verifierDeclen-   │
   │  chements()  (1h)  │     mix < seuil ?  ──► clôturer + vendre le stock
   └────────────────────┘
```

---

## 2. Récupérer le mix énergétique français (appel API + parsing XML)

On interroge l'API **ENTSO-E** (plateforme officielle européenne de transparence sur
l'électricité). Elle répond en **XML**, qu'on transforme en pourcentages par type de source.

```js
async function fetchMixEnergetique() {
    const apiKey = process.env.ENTSOE_API_KEY;            // clé secrète, dans le .env
    if (!apiKey) return null;

    const now   = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // les dernières 24h

    // On construit l'URL de l'API avec nos paramètres (zone France, type de données...)
    const url = `${ENTSOE_BASE}?securityToken=${apiKey}&documentType=A75`
              + `&in_Domain=${FRANCE_DOMAIN}&periodStart=...&periodEnd=...`;

    // fetch = appel HTTP. AbortSignal.timeout(10000) = on abandonne après 10s
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const xml = await res.text();

    return parseGenerationXML(xml);   // on transforme le XML en données utilisables
}
```

**À expliquer simplement :**
- `fetch(...)` = on appelle un serveur extérieur sur Internet.
- `AbortSignal.timeout(10000)` = sécurité : si l'API ne répond pas en 10 secondes, on arrête (on ne bloque pas l'application).
- La clé API est rangée dans le fichier `.env`, **jamais** écrite en dur dans le code.

### Le parsing : du XML vers des pourcentages

```js
function parseGenerationXML(xml) {
    const mix = {};
    let total = 0;

    const parsed = xmlParser.parse(xml);          // librairie fast-xml-parser
    const timeSeries = parsed.GL_MarketDocument.TimeSeries || [];

    for (const ts of timeSeries) {
        const type = PSR_MAP[ts.MktPSRType.psrType]; // ex: "B19" → "EOLIEN"
        if (!type) continue;

        const points = ts.Period.Point;
        const qty = parseFloat(points[points.length - 1].quantity); // dernière mesure
        mix[type] = (mix[type] || 0) + qty;          // on additionne par type
        total += qty;
    }

    // On convertit chaque quantité en POURCENTAGE du total
    const result = {};
    for (const [type, qty] of Object.entries(mix)) {
        result[type] = Math.round((qty / total) * 100);
    }
    return result;   // ex: { EOLIEN: 35, SOLAIRE: 12, NUCLEAIRE: 45, ... }
}
```

`PSR_MAP` traduit les codes techniques d'ENTSO-E en noms simples :

```js
const PSR_MAP = {
    B19: 'EOLIEN', B18: 'EOLIEN',
    B16: 'SOLAIRE',
    B10: 'HYDRAULIQUE', B11: 'HYDRAULIQUE',
    B14: 'NUCLEAIRE',
};
```

---

## 3. Le cache 1 heure (on n'appelle pas l'API à chaque fois)

L'API a un quota limité, et les données ne changent pas toutes les secondes. On **garde en
mémoire** le dernier résultat pendant 1 heure.

```js
const CACHE_TTL_MS = 60 * 60 * 1000;          // 1 heure
const cache = { data: null, fetchedAt: 0 };

function isCacheValid() {
    // Le cache est valide s'il existe ET qu'il a moins d'1h
    return cache.data && (Date.now() - cache.fetchedAt) < CACHE_TTL_MS;
}

export async function getMixEnergetique() {
    if (isCacheValid()) return cache.data;     // ✅ on réutilise, pas d'appel réseau
    const mix = await fetchMixEnergetique();   // sinon on rappelle l'API
    if (mix) { cache.data = mix; cache.fetchedAt = Date.now(); }
    return mix;
}
```

**À expliquer simplement :** un cache, c'est une « mémoire courte ». On évite de redemander
sans cesse la même chose à l'API → plus rapide et on respecte le quota.

---

## 4. La tâche planifiée : vérifier toutes les heures

Dans `server.js`, on programme une vérification **automatique toutes les heures** avec
`setInterval`.

```js
import { verifierDeclenchements } from './src/services/energieService.js';

server.listen(PORT, () => {
    // setInterval(fonction, délai) = exécuter "fonction" en boucle, ici toutes les heures
    setInterval(verifierDeclenchements, 60 * 60 * 1000);   // 60 min × 60 s × 1000 ms
    console.log('⚡ Déclenchements automatiques énergie activés (interval 1h)');
});
```

**À expliquer simplement :** `setInterval` est un minuteur qui rappelle notre fonction en
boucle, sans qu'un utilisateur ait besoin de cliquer.

---

## 5. La logique métier : produire ou vendre automatiquement

C'est le cœur du système. Pour chaque seuil configuré, on compare le mix au seuil.

```js
export async function verifierDeclenchements() {
    const mix = await getMixEnergetique();
    if (!mix) return;                          // pas de données → on ne fait rien

    // On récupère les seuils actifs en mode automatique
    const seuils = await prisma.seuilEnergie.findMany({
        where: { declenchementAuto: true, statut: 'ACTIF' },
        include: { source: { include: { stock: true } } }
    });

    for (const seuil of seuils) {
        const source = seuil.source;
        const mixPct = mix[source.type] ?? 0;  // ex: pour EOLIEN → 35 (%)

        // ── CAS 1 : la source est abondante → ON PRODUIT ───────────────
        if (mixPct >= seuil.seuilDeclenchement) {
            // ... création d'une session de production "EN_COURS" ...
        }

        // ── CAS 2 : la source devient rare → ON CLÔTURE ET ON VEND ─────
        if (mixPct < seuil.seuilArret) {
            // ... clôture des sessions + vente du stock (en transaction) ...
        }
    }
}
```

### La vente automatique en **transaction** (point technique fort)

Quand on arrête une production, plusieurs opérations doivent se faire **ensemble** :
clôturer la session, ajouter la production au stock, créer la vente, vider le stock.
Une **transaction** garantit que c'est **tout ou rien** : si une étape échoue, **aucune**
n'est appliquée (pas de données incohérentes).

```js
const operationsDb = [];

for (const s of sessions) {
    // 1) marquer la session comme terminée
    operationsDb.push(prisma.sessionEnergie.update({
        where: { id: s.id },
        data:  { statut: 'TERMINEE', finReel: new Date() }
    }));
    // 2) ajouter la production au stock
    operationsDb.push(prisma.stockEnergie.upsert({ /* ... */ }));
}

// 3) créer la vente de tout le stock disponible
if (stockActuel > 0) {
    operationsDb.push(prisma.venteEnergie.create({
        data: { sourceId: source.id, quantite: stockActuel,
                prixVente: source.coutProduction,
                total: stockActuel * source.coutProduction }
    }));
    // 4) remettre le stock à zéro
    operationsDb.push(prisma.stockEnergie.update({
        where: { sourceId: source.id }, data: { quantite: 0 }
    }));
}

// $transaction = on exécute TOUT d'un seul bloc, ou RIEN si erreur
await prisma.$transaction(operationsDb);
```

**À expliquer simplement :** une transaction, c'est comme un virement bancaire — on ne peut
pas débiter un compte sans créditer l'autre. Soit les deux, soit aucun.

---

## 6. Les notifications persistées

À chaque action automatique, on enregistre une notification pour informer l'utilisateur.
Elles sont **stockées en base de données** : elles survivent à un redémarrage du serveur.

```js
export async function pushNotification(type, message) {
    try {
        await prisma.notification.create({ data: { type, message } });
        // on ne garde que les 50 plus récentes (purge des anciennes)
    } catch {
        // repli : si la table n'existe pas encore, on garde en mémoire
        _notifications.unshift({ type, message, at: new Date().toISOString() });
    }
}
```

Appelée au moment d'un déclenchement :

```js
await pushNotification('production',
    `Production déclenchée automatiquement : ${source.nom} (mix ${mixPct}% ≥ seuil ${seuil.seuilDeclenchement}%)`);
```

Côté interface, une cloche de notifications interroge le serveur régulièrement pour les afficher.

---

## 7. Ce qu'il faut retenir (points à valoriser à l'oral)

| Compétence démontrée | Où, dans le code |
|---|---|
| **Appel d'une API externe** (HTTP, clé sécurisée, timeout) | `fetchMixEnergetique()` |
| **Parsing de données** (XML → objet exploitable) | `parseGenerationXML()` |
| **Optimisation / cache** (TTL 1 h, respect du quota API) | `isCacheValid()` / `getMixEnergetique()` |
| **Tâche planifiée / automatisation** (`setInterval`) | `server.js` |
| **Logique métier conditionnelle** (seuils production/arrêt) | `verifierDeclenchements()` |
| **Intégrité des données** (transaction « tout ou rien ») | `prisma.$transaction(...)` |
| **Persistance** (notifications en base) | `pushNotification()` |

> **Phrase de conclusion possible :** « Cette fonctionnalité transforme Smart-Yield d'un
> simple outil de saisie en un véritable **automate de décision** : l'application réagit en
> temps réel à l'état du réseau électrique français pour optimiser la production et les ventes,
> de manière fiable grâce aux transactions. »
