// Génère le workflow N8N "Module D — Veille Performance Concurrents".
//
// Les nœuds Code embarquent le contenu de lib.js (lui-même généré depuis les
// sources testées). Le workflow n'est donc jamais écrit à la main : régénérer
// avec `npm run build:n8n` et réimporter dans N8N.
//
// AUCUN SECRET ICI. Les appels Apify passent par un credential N8N de type
// Header Auth, à créer une fois dans l'interface. Rien à purger avant commit.

const COMPTES_DB_URL = "https://www.notion.so/4aa33ab381b84f75a5b76511c97d7a3b";
const POSTS_DB_URL = "https://www.notion.so/4ad61bf0d0374dc78298d20b91a756ee";

const FENETRE_JOURS = 14;
const POSTS_PAR_COMPTE = 15;

// ---------------------------------------------------------------------------
// Code des nœuds — glue N8N, la logique métier vient de lib.js
// ---------------------------------------------------------------------------

const CODE_PREPARER_HANDLES = `// Lit les comptes actifs et prépare les listes de handles par plateforme.
const comptes = $input.all().map((i) => i.json);

const actifs = comptes.filter((c) => c.properties && c.properties.Actif && c.properties.Actif.checkbox === true);

const parPlateforme = { Instagram: [], TikTok: [] };
const fiches = {};

for (const c of actifs) {
  const p = c.properties || {};
  const plateforme = p.Plateforme && p.Plateforme.select ? p.Plateforme.select.name : null;
  const handleBrut = p.Handle && p.Handle.rich_text && p.Handle.rich_text[0] ? p.Handle.rich_text[0].plain_text : '';
  const handle = String(handleBrut || '').toLowerCase().replace('@', '').trim();

  if (!plateforme || !handle || !parPlateforme[plateforme]) continue;

  parPlateforme[plateforme].push(handle);
  fiches[plateforme + ':' + handle] = c.id;
}

const depuis = new Date(Date.now() - ${FENETRE_JOURS} * 24 * 3600 * 1000).toISOString();

return [{ json: {
  instagram: parPlateforme.Instagram,
  tiktok: parPlateforme.TikTok,
  fiches,
  depuis,
  nbComptes: actifs.length
} }];`;

const GLUE_NORMALISER = `
// ---- glue N8N ----
const prep = $('Preparer Handles').first().json;

const erreurs = [];

// Avec onError: continueRegularOutput, un appel Apify qui échoue n'émet pas
// d'exception : il émet un item { error: {...} } comme un résultat normal.
// Sans cette détection, une panne de scraping remonte comme « 0 publication
// collectée », c'est-à-dire un succès. C'est arrivé.
function collecter(nomNoeud, plateforme) {
  let items;
  try {
    items = $(nomNoeud).all().map((i) => i.json);
  } catch (e) {
    erreurs.push(plateforme + ' : ' + e.message);
    return [];
  }

  const enErreur = items.filter((x) => x && x.error);
  if (enErreur.length > 0) {
    const detail = enErreur[0].error;
    const message = (detail && detail.message) || JSON.stringify(detail);
    erreurs.push(plateforme + ' : ' + String(message).slice(0, 200));
    return [];
  }

  return items;
}

const brutIg = collecter('Apify Instagram', 'Instagram');
const brutTt = collecter('Apify TikTok', 'TikTok');

const depuis = new Date(prep.depuis).getTime();

// Fenêtre glissante + rattachement à la fiche compte Notion.
// Un post dont le compte n'est pas dans le registre est écarté : il ne doit
// pas polluer les moyennes d'un autre compte.
const posts = [];
for (const p of [...normaliserInstagram(brutIg), ...normaliserTikTok(brutTt)]) {
  if (!p.datePublication) continue;
  const t = Date.parse(p.datePublication);
  if (Number.isNaN(t) || t < depuis) continue;

  const pageCompte = prep.fiches[p.plateforme + ':' + p.handle];
  if (!pageCompte) continue;

  posts.push({ ...p, pageCompte });
}

return [{ json: { posts, erreurs, nbComptes: prep.nbComptes } }];`;

const GLUE_SCORER = `
// ---- glue N8N ----
const collecte = $('Normaliser').first().json;
const pagesNotion = $input.all().map((i) => i.json).filter((p) => p && p.properties);

const txt = (prop) => {
  if (!prop || !Array.isArray(prop.rich_text)) return '';
  return prop.rich_text.map((t) => t.plain_text || (t.text && t.text.content) || '').join('');
};
const nombre = (prop) => (prop && typeof prop.number === 'number' ? prop.number : null);
const selectNom = (prop) => (prop && prop.select ? prop.select.name : '');
const dateDebut = (prop) => (prop && prop.date ? prop.date.start : '');

// Historique = ce qui est déjà en base. Le Handle est indispensable ici :
// l'URL d'un post Instagram (/p/CODE/) ne contient pas le nom du compte.
const historique = pagesNotion.map((page) => ({
  postId: txt(page.properties['Post ID']),
  pageId: page.id,
  handle: txt(page.properties['Handle']),
  plateforme: selectNom(page.properties['Plateforme']),
  metriqueScore: selectNom(page.properties['Métrique de score']) || 'Vues',
  vues: nombre(page.properties['Vues']),
  likes: nombre(page.properties['Likes']),
  datePublication: dateDebut(page.properties['Date publication'])
})).filter((h) => h.postId);

const pagesParPostId = {};
for (const h of historique) pagesParPostId[h.postId] = h.pageId;

// Historique de travail = base + lot courant, pour que les publications de la
// semaine se comparent aussi entre elles. Les compteurs des posts déjà connus
// sont rafraîchis avec les valeurs qui viennent d'être collectées.
const parId = new Map();
for (const h of historique) parId.set(h.postId, h);
for (const p of collecte.posts) {
  const ancien = parId.get(p.postId);
  parId.set(p.postId, ancien ? { ...ancien, vues: p.vues, likes: p.likes } : p);
}
const historiqueComplet = [...parId.values()];

const scores = collecte.posts.map((p) => ({ ...p, ...calculerScore(p, historiqueComplet) }));
const reparti = repartir(scores, pagesParPostId);

// Moyennes par fiche compte, calculées séparément par métrique.
const comptesVus = {};
for (const p of scores) {
  if (!comptesVus[p.pageCompte]) comptesVus[p.pageCompte] = { handle: p.handle, plateforme: p.plateforme };
}

const moyenne = (valeurs) => (valeurs.length ? Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length) : 0);

const majComptes = Object.keys(comptesVus).map((pageId) => {
  const info = comptesVus[pageId];
  const duCompte = historiqueComplet.filter((h) => h.handle === info.handle && h.plateforme === info.plateforme);
  return {
    pageId,
    moyenneVues: moyenne(duCompte.filter((h) => typeof h.vues === 'number' && h.vues > 0).map((h) => h.vues)),
    moyenneLikes: moyenne(duCompte.filter((h) => typeof h.likes === 'number' && h.likes > 0).map((h) => h.likes)),
    nbBaseline: duCompte.length
  };
});

const surperformants = scores.filter((s) => s.surperforme).sort((a, b) => b.score - a.score);

return [{ json: {
  creations: reparti.creations,
  majs: reparti.majs,
  majComptes,
  surperformants,
  erreurs: collecte.erreurs,
  aujourdhui: new Date().toISOString().split('T')[0],
  total: scores.length,
  nbCreations: reparti.creations.length,
  nbMajs: reparti.majs.length,
  nbSurperformants: surperformants.length
} }];`;

const CODE_FILTRER_CREATIONS = `// Un item par page à créer. Tableau vide => le nœud Notion en aval ne tourne pas.
const s = $('Scorer').first().json;
return (s.creations || []).map((p) => ({ json: { ...p, collecteLe: s.aujourdhui } }));`;

const CODE_FILTRER_MAJS = `// Un item par page à mettre à jour, avec son identifiant de page Notion.
const s = $('Scorer').first().json;
return (s.majs || []).map((m) => ({ json: { ...m.post, pageId: m.pageId, collecteLe: s.aujourdhui } }));`;

const CODE_FILTRER_COMPTES = `// Un item par fiche compte dont les moyennes sont à rafraîchir.
const s = $('Scorer').first().json;
return (s.majComptes || []).map((c) => ({ json: { ...c, collecteLe: s.aujourdhui } }));`;

// ---------------------------------------------------------------------------
// Fabriques de nœuds
// ---------------------------------------------------------------------------

function noeudCode(nom, code, position) {
    return {
        parameters: { jsCode: code },
        id: idStable(nom),
        name: nom,
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position,
    };
}

function noeudApify(nom, acteur, corpsExpression, position) {
    return {
        parameters: {
            method: "POST",
            url: `https://api.apify.com/v2/acts/${acteur}/run-sync-get-dataset-items`,
            authentication: "genericCredentialType",
            genericAuthType: "httpHeaderAuth",
            sendBody: true,
            specifyBody: "json",
            jsonBody: corpsExpression,
            options: {
                timeout: 300000,
                response: { response: { neverError: true } },
            },
        },
        id: idStable(nom),
        name: nom,
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position,
        // Une plateforme en panne ne doit pas tuer la collecte de l'autre.
        onError: "continueRegularOutput",
    };
}

// Identifiants déterministes : régénérer le workflow ne doit pas produire un
// diff bruité ni casser les connexions au réimport.
function idStable(nom) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < nom.length; i++) {
        h1 = Math.imul(h1 ^ nom.charCodeAt(i), 0x01000193) >>> 0;
        h2 = Math.imul(h2 + nom.charCodeAt(i), 0x85ebca6b) >>> 0;
    }
    const hex = (h1.toString(16) + h2.toString(16)).padEnd(16, "0").slice(0, 16);
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        "4" + hex.slice(12, 15),
        "a" + hex.slice(0, 3),
        hex.slice(0, 12),
    ].join("-");
}

function proprieteTexte(cle, expression) {
    return {
        key: `${cle}|rich_text`,
        richText: true,
        text: { text: [{ text: expression, annotationUi: {} }] },
    };
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export function genererWorkflow(lib) {
    const noeuds = [
        {
            parameters: {
                rule: { interval: [{ field: "weeks", triggerAtDay: [1], triggerAtHour: 8 }] },
            },
            id: idStable("Schedule Lundi 8h"),
            name: "Schedule Lundi 8h",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1.3,
            position: [0, 0],
        },
        {
            parameters: {
                httpMethod: "POST",
                path: "anna-veille-performance",
                responseMode: "responseNode",
                options: {},
            },
            id: idStable("Webhook Manuel"),
            name: "Webhook Manuel",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [0, 200],
        },
        {
            parameters: {
                resource: "databasePage",
                operation: "getAll",
                databaseId: { __rl: true, mode: "url", value: COMPTES_DB_URL },
                returnAll: true,
                simple: false,
                options: {},
            },
            id: idStable("Lire Comptes Actifs"),
            name: "Lire Comptes Actifs",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [220, 100],
        },
        noeudCode("Preparer Handles", CODE_PREPARER_HANDLES, [440, 100]),
        noeudApify(
            "Apify Instagram",
            "apify~instagram-scraper",
            `={{ JSON.stringify({ directUrls: $json.instagram.map(h => 'https://www.instagram.com/' + h + '/'), resultsType: 'posts', resultsLimit: ${POSTS_PAR_COMPTE}, addParentData: false }) }}`,
            [660, 100]
        ),
        noeudApify(
            "Apify TikTok",
            "clockworks~tiktok-scraper",
            `={{ JSON.stringify({ profiles: $('Preparer Handles').first().json.tiktok, resultsPerPage: ${POSTS_PAR_COMPTE}, shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false, shouldDownloadSlideshowImages: false }) }}`,
            [880, 100]
        ),
        noeudCode("Normaliser", lib + GLUE_NORMALISER, [1100, 100]),
        {
            parameters: {
                resource: "databasePage",
                operation: "getAll",
                databaseId: { __rl: true, mode: "url", value: POSTS_DB_URL },
                returnAll: true,
                simple: false,
                options: {},
            },
            id: idStable("Lire Posts Existants"),
            name: "Lire Posts Existants",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [1320, 100],
        },
        noeudCode("Scorer", lib + GLUE_SCORER, [1540, 100]),
        noeudCode("Filtrer Creations", CODE_FILTRER_CREATIONS, [1760, -100]),
        noeudCode("Filtrer Majs", CODE_FILTRER_MAJS, [1760, 100]),
        noeudCode("Filtrer Comptes", CODE_FILTRER_COMPTES, [1760, 300]),
        {
            parameters: {
                resource: "databasePage",
                databaseId: { __rl: true, mode: "url", value: POSTS_DB_URL },
                title: "={{ $json.accroche }}",
                simple: false,
                propertiesUi: {
                    propertyValues: [
                        { key: "Compte|relation", relationValue: ["={{ $json.pageCompte }}"] },
                        proprieteTexte("Handle", "={{ $json.handle }}"),
                        { key: "Plateforme|select", selectValue: "={{ $json.plateforme }}" },
                        { key: "Type|select", selectValue: "={{ $json.type }}" },
                        { key: "URL post|url", urlValue: "={{ $json.url }}" },
                        { key: "Date publication|date", includeTime: false, date: "={{ $json.datePublication }}" },
                        { key: "Vues|number", numberValue: "={{ $json.vues }}" },
                        { key: "Likes|number", numberValue: "={{ $json.likes }}" },
                        { key: "Commentaires|number", numberValue: "={{ $json.commentaires }}" },
                        { key: "Métrique de score|select", selectValue: "={{ $json.metriqueScore }}" },
                        { key: "Score surperformance|number", numberValue: "={{ $json.score }}" },
                        proprieteTexte("Post ID", "={{ $json.postId }}"),
                        { key: "Collecté le|date", includeTime: false, date: "={{ $json.collecteLe }}" },
                    ],
                },
                options: {},
            },
            id: idStable("Creer Posts"),
            name: "Creer Posts",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [1980, -100],
        },
        {
            parameters: {
                resource: "databasePage",
                operation: "update",
                pageId: { __rl: true, mode: "id", value: "={{ $json.pageId }}" },
                simple: false,
                propertiesUi: {
                    propertyValues: [
                        // Volontairement absents : Analyse IA, Angle, Transposable Anna
                        // (payés une seule fois par le LLM) et Recyclé (posé par le dashboard).
                        { key: "Vues|number", numberValue: "={{ $json.vues }}" },
                        { key: "Likes|number", numberValue: "={{ $json.likes }}" },
                        { key: "Commentaires|number", numberValue: "={{ $json.commentaires }}" },
                        { key: "Score surperformance|number", numberValue: "={{ $json.score }}" },
                        proprieteTexte("Handle", "={{ $json.handle }}"),
                        { key: "Collecté le|date", includeTime: false, date: "={{ $json.collecteLe }}" },
                    ],
                },
                options: {},
            },
            id: idStable("Maj Posts"),
            name: "Maj Posts",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [1980, 100],
        },
        {
            parameters: {
                resource: "databasePage",
                operation: "update",
                pageId: { __rl: true, mode: "id", value: "={{ $json.pageId }}" },
                simple: false,
                propertiesUi: {
                    propertyValues: [
                        { key: "Moyenne vues|number", numberValue: "={{ $json.moyenneVues }}" },
                        { key: "Moyenne likes|number", numberValue: "={{ $json.moyenneLikes }}" },
                        { key: "Nb posts baseline|number", numberValue: "={{ $json.nbBaseline }}" },
                        { key: "Dernière collecte|date", includeTime: false, date: "={{ $json.collecteLe }}" },
                    ],
                },
                options: {},
            },
            id: idStable("Maj Comptes"),
            name: "Maj Comptes",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [1980, 300],
        },
        {
            parameters: {
                respondWith: "json",
                responseBody:
                    "={{ JSON.stringify({ total: $json.total, creations: $json.nbCreations, majs: $json.nbMajs, surperformants: $json.nbSurperformants, erreurs: $json.erreurs }) }}",
                options: {},
            },
            id: idStable("Reponse Webhook"),
            name: "Reponse Webhook",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1,
            position: [1760, 500],
        },
    ];

    const connexions = {
        "Schedule Lundi 8h": { main: [[{ node: "Lire Comptes Actifs", type: "main", index: 0 }]] },
        "Webhook Manuel": { main: [[{ node: "Lire Comptes Actifs", type: "main", index: 0 }]] },
        "Lire Comptes Actifs": { main: [[{ node: "Preparer Handles", type: "main", index: 0 }]] },
        // Les deux appels Apify sont chaînés plutôt que parallèles : un nœud Code
        // à deux entrées sur le même index a un comportement de fusion peu lisible.
        // TikTok relit sa liste via $('Preparer Handles'), pas via son entrée.
        "Preparer Handles": { main: [[{ node: "Apify Instagram", type: "main", index: 0 }]] },
        "Apify Instagram": { main: [[{ node: "Apify TikTok", type: "main", index: 0 }]] },
        "Apify TikTok": { main: [[{ node: "Normaliser", type: "main", index: 0 }]] },
        Normaliser: { main: [[{ node: "Lire Posts Existants", type: "main", index: 0 }]] },
        "Lire Posts Existants": { main: [[{ node: "Scorer", type: "main", index: 0 }]] },
        Scorer: {
            main: [[
                { node: "Filtrer Creations", type: "main", index: 0 },
                { node: "Filtrer Majs", type: "main", index: 0 },
                { node: "Filtrer Comptes", type: "main", index: 0 },
                { node: "Reponse Webhook", type: "main", index: 0 },
            ]],
        },
        "Filtrer Creations": { main: [[{ node: "Creer Posts", type: "main", index: 0 }]] },
        "Filtrer Majs": { main: [[{ node: "Maj Posts", type: "main", index: 0 }]] },
        "Filtrer Comptes": { main: [[{ node: "Maj Comptes", type: "main", index: 0 }]] },
    };

    return {
        name: "📈 Anna — Module D — Veille Performance Concurrents",
        nodes: noeuds,
        connections: connexions,
        settings: { executionOrder: "v1" },
    };
}
