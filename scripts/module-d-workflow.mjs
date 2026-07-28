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

// Ollama du VPS depuis le réseau Docker interne : pas d'authentification, donc
// pas de clé à loger dans le workflow ni dans un credential.
const OLLAMA_URL = "http://172.18.0.1:11434/api/chat";
const MODELE_LLM = "glm-5.2:cloud";

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
// On repart de TOUS les comptes actifs, pas seulement de ceux qui ont produit
// des publications : un compte dormant doit voir sa date de collecte mise à
// jour, sinon rien ne distingue « interrogé, rien de neuf » de « jamais
// interrogé ». Un compte sans publication récente ressort avec nbBaseline à 0.
const prep = $('Preparer Handles').first().json;
const comptesVus = {};
for (const cle of Object.keys(prep.fiches || {})) {
  const separateur = cle.indexOf(':');
  comptesVus[prep.fiches[cle]] = {
    plateforme: cle.slice(0, separateur),
    handle: cle.slice(separateur + 1)
  };
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

// Le seuil et la limite viennent de lib.js (SEUIL_SURPERFORMANCE), mais ce nœud
// n'embarque pas la lib : on relit la valeur en dur pour garder le nœud léger.
const CODE_FILTRER_A_QUALIFIER = `// Publications à faire qualifier par le LLM.
// On relit l'état réel de Notion plutôt que la sortie du calcul : à ce stade
// les créations sont écrites, donc les nouvelles publications ont un identifiant
// de page et peuvent recevoir leur analyse dès cette exécution.
const SEUIL = 1.5;
const MAX_PAR_EXECUTION = 8;

const txt = (prop) => {
  if (!prop || !Array.isArray(prop.rich_text)) return '';
  return prop.rich_text.map((t) => t.plain_text || (t.text && t.text.content) || '').join('');
};

const candidats = $input.all()
  .map((i) => i.json)
  .filter((page) => page && page.properties)
  .map((page) => {
    const p = page.properties;
    return {
      pageId: page.id,
      score: p['Score surperformance'] && typeof p['Score surperformance'].number === 'number' ? p['Score surperformance'].number : null,
      dejaAnalyse: txt(p['Analyse IA']).trim().length > 0,
      accroche: (p['Accroche'].title || []).map((t) => t.plain_text).join(''),
      legende: '',
      handle: txt(p['Handle']),
      plateforme: p['Plateforme'] && p['Plateforme'].select ? p['Plateforme'].select.name : '',
      type: p['Type'] && p['Type'].select ? p['Type'].select.name : '',
      metriqueScore: p['Métrique de score'] && p['Métrique de score'].select ? p['Métrique de score'].select.name : 'Vues',
      vues: p['Vues'] && typeof p['Vues'].number === 'number' ? p['Vues'].number : 0,
      likes: p['Likes'] && typeof p['Likes'].number === 'number' ? p['Likes'].number : 0,
      url: p['URL post'] ? p['URL post'].url : ''
    };
  })
  // L'analyse n'est jamais repayée : une publication déjà qualifiée est ignorée.
  .filter((c) => c.score !== null && c.score >= SEUIL && !c.dejaAnalyse)
  .sort((a, b) => b.score - a.score)
  .slice(0, MAX_PAR_EXECUTION);

// Les légendes complètes ne sont pas dans Notion (seule l'accroche l'est).
// On les récupère depuis le lot fraîchement collecté quand elles y sont.
const collecte = $('Normaliser').first().json.posts || [];
const parAccroche = {};
for (const p of collecte) parAccroche[p.accroche] = p.legende;

return candidats.map((c) => ({ json: { ...c, legende: parAccroche[c.accroche] || c.accroche } }));`;

const CODE_BUILD_PROMPT = `// Un prompt par publication. Le nœud cascade en aval tourne une fois par item.
return $input.all().map((item) => {
const p = item.json;
const valeur = p.metriqueScore === 'Likes' ? p.likes : p.vues;

const prompt = \`Tu analyses une publication de concurrent qui a nettement surperformé par rapport à la moyenne de son propre compte.

Compte : @\${p.handle} sur \${p.plateforme}
Type : \${p.type}
Score de surperformance : \${p.score}× la moyenne habituelle de ce compte
Métrique : \${p.metriqueScore} — \${valeur}
Légende : \${String(p.legende || '').slice(0, 1500)}

Contexte : Anna Ollivier est psychologue clinicienne, spécialisée en développement émotionnel de l'enfant. Elle crée du contenu pour les parents.

Réponds UNIQUEMENT en JSON valide, sans backtick ni commentaire :
{
  "angle": ["deux à quatre mots-clés d'angle éditorial"],
  "format": "description courte du format",
  "accroche": "type d'accroche utilisé",
  "pourquoi": "deux phrases maximum sur ce qui explique la performance",
  "transposable": "Oui | Non | À adapter"
}\`;

return { json: { prompt, pageId: p.pageId } };
});`;

// Pas de nœud Code pour l'appel LLM : un nœud Code N8N ne peut ni lire $env ni
// utiliser httpRequestWithAuthentication, donc y appeler une API authentifiée
// imposerait d'écrire la clé en dur — ce qu'un export de workflow versionnerait.
// L'appel passe donc par un nœud HTTP Request avec credential.
//
// Conséquence assumée : pas de repli deepseek/qwen ici, contrairement aux
// Modules A/B/C. Là-bas la sortie LLM est le livrable ; ici c'est un
// enrichissement, et une publication non qualifiée est automatiquement reprise
// à l'exécution suivante puisque le filtre ne retient que les analyses vides.

// Tourne une fois pour tous les items : les publications dont la qualification
// a échoué sont simplement écartées du flux, sans nœud IF supplémentaire. Leur
// champ Analyse IA reste vide, donc elles repasseront à la prochaine exécution.
const CODE_PARSER = `const resultats = [];

// Le nœud HTTP Request ne réémet pas les champs d'entrée : on réapparie la
// réponse à sa publication par l'index. Le nœud émet un item par item d'entrée,
// dans l'ordre, mais on vérifie quand même plutôt que de supposer.
const demandes = $('Build Prompt Qualification').all().map((i) => i.json);
const reponses = $input.all();

if (reponses.length !== demandes.length) {
  throw new Error(
    'Appariement impossible : ' + reponses.length + ' réponse(s) pour ' +
    demandes.length + ' demande(s). Aucune analyse écrite pour éviter de les attribuer au mauvais post.'
  );
}

for (let i = 0; i < reponses.length; i++) {
  const j = reponses[i].json;
  const pageId = demandes[i].pageId;

  // onError: continueRegularOutput fait passer un échec HTTP comme un item normal.
  if (!j || j.error) continue;

  // Réponse Ollama : { message: { content } }. Un content vide sur un modèle de
  // raisonnement signale un think non désactivé.
  const brut = (j.message && j.message.content) || '';
  const nettoye = brut.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

  let data = null;
  try {
    data = JSON.parse(nettoye);
  } catch (e) {
    const debut = nettoye.indexOf('{');
    const fin = nettoye.lastIndexOf('}');
    if (debut !== -1 && fin !== -1) {
      try { data = JSON.parse(nettoye.slice(debut, fin + 1)); } catch (e2) { data = null; }
    }
  }

  if (!data) continue;

  const angles = Array.isArray(data.angle) ? data.angle.slice(0, 4).join(', ') : String(data.angle || '');
  const transposable = ['Oui', 'Non', 'À adapter'].includes(data.transposable) ? data.transposable : 'À adapter';

  // Notion refuse tout objet rich_text au-delà de 2000 caractères.
  const analyse = [
    'Angle : ' + angles,
    'Format : ' + (data.format || ''),
    'Accroche : ' + (data.accroche || ''),
    '',
    data.pourquoi || ''
  ].join('\\n').slice(0, 1900);

  resultats.push({ json: { pageId, analyse, transposable } });
}

return resultats;`;

const CODE_AGREGER_MAIL = `const s = $('Scorer').first().json;

const lien = (p) => p.url || '';
const ligne = (p, i) => {
  const valeur = p.metriqueScore === 'Likes' ? p.likes + ' likes' : p.vues + ' vues';
  return '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin:10px 0;">' +
    '<strong style="color:#7c3aed">' + p.score + '× la moyenne du compte</strong> — @' + p.handle +
    ' (' + p.plateforme + ', ' + p.type + ')<br>' +
    '<em>' + (p.accroche || '') + '</em><br>' +
    valeur + ' · <a href="' + lien(p) + '">voir la publication</a></div>';
};

const top = (s.surperformants || []).slice(0, 5).map(ligne).join('') ||
  '<p>Aucune publication au-dessus du seuil cette semaine.</p>';

// Un compte sans aucune publication en base est dormant ou mal saisi.
// Sans ce signalement, rien ne le distingue d'une collecte réussie mais vide.
const dormants = (s.majComptes || []).filter((c) => !c.nbBaseline);
const blocDormants = dormants.length
  ? '<h3>Comptes sans publication récente</h3><p>' + dormants.length +
    ' compte(s) actif(s) n\\'ont rien publié dans la fenêtre analysée. ' +
    'Vérifie qu\\'ils sont toujours pertinents.</p>'
  : '';

const blocErreurs = (s.erreurs || []).length
  ? '<h3 style="color:#b91c1c">Incidents de collecte</h3><p>' + s.erreurs.join('<br>') + '</p>'
  : '';

const corps = '<h2 style="color:#7c3aed">Veille performance concurrents — ' + s.aujourdhui + '</h2>' +
  '<p>' + s.total + ' publication(s) analysée(s), ' + s.nbCreations + ' nouvelle(s), ' +
  s.nbSurperformants + ' au-dessus du seuil de 1,5×.</p>' +
  '<h3>Top surperformances</h3>' + top +
  blocDormants + blocErreurs +
  '<p style="color:#666;font-size:12px">Détail et analyses dans la base Notion « Posts Concurrents ».</p>';

return [{ json: { corps, sujet: 'Veille performance concurrents — ' + s.aujourdhui } }];`;

// ---------------------------------------------------------------------------
// Fabriques de nœuds
// ---------------------------------------------------------------------------

// Tous les nœuds Code d'ici tournent en mode "une fois pour tous les items"
// (le défaut N8N) et manipulent explicitement $input.all(). Le nœud HTTP
// Request, lui, s'exécute automatiquement une fois par item d'entrée : c'est
// ce qui donne un appel LLM par publication.
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
                // Un webhook ouvert laisse n'importe qui brûler les crédits Apify,
                // le quota Ollama cloud et écrire dans Notion. L'authentification
                // est portée par un credential Header Auth, pas par un token en
                // dur dans un nœud Code — sinon le secret revient dans l'export.
                authentication: "headerAuth",
                // La collecte dure 90 à 130 s : bien au-delà du délai d'une
                // fonction serverless Vercel. On accuse réception immédiatement
                // et le dashboard relit Notion ensuite.
                // Valeurs valides : onReceived | lastNode | responseNode.
                // "immediately" n'existe pas — N8N l'accepte à l'import puis le
                // supprime silencieusement, laissant la requête sans réponse.
                responseMode: "onReceived",
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
        // ----- Qualification LLM + rapport -----
        // Branchées après "Maj Comptes", seul nœud d'écriture garanti de tourner
        // (un item par compte actif). Les créations sont donc déjà écrites, et
        // une publication créée à l'instant a bien un identifiant de page.
        {
            parameters: {
                resource: "databasePage",
                operation: "getAll",
                databaseId: { __rl: true, mode: "url", value: POSTS_DB_URL },
                returnAll: true,
                simple: false,
                options: {},
            },
            id: idStable("Lire Posts A Qualifier"),
            name: "Lire Posts A Qualifier",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [2200, 300],
        },
        noeudCode("Filtrer A Qualifier", CODE_FILTRER_A_QUALIFIER, [2420, 300]),
        noeudCode("Build Prompt Qualification", CODE_BUILD_PROMPT, [2640, 300]),
        {
            parameters: {
                method: "POST",
                // Ollama du VPS, joignable sur le réseau Docker interne : aucune
                // authentification, donc aucun secret dans le workflow ni dans un
                // credential. L'accès aux modèles :cloud dépend du `ollama login`
                // fait côté serveur ; un 401 se règle par `ollama login` en SSH.
                url: OLLAMA_URL,
                sendBody: true,
                specifyBody: "json",
                // think: false est obligatoire — sur un modèle de raisonnement, le
                // « thinking » consomme tout num_predict et message.content revient vide.
                jsonBody: `={{ JSON.stringify({ model: '${MODELE_LLM}', messages: [{ role: 'user', content: $json.prompt }], stream: false, think: false, options: { num_predict: 800 } }) }}`,
                options: { timeout: 300000, response: { response: { neverError: true } } },
            },
            id: idStable("Appel LLM"),
            name: "Appel LLM",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [2860, 300],
            // Un échec de qualification ne doit pas emporter la collecte.
            onError: "continueRegularOutput",
        },
        noeudCode("Parser Qualification", CODE_PARSER, [3080, 300]),
        {
            parameters: {
                resource: "databasePage",
                operation: "update",
                pageId: { __rl: true, mode: "id", value: "={{ $json.pageId }}" },
                simple: false,
                propertiesUi: {
                    propertyValues: [
                        proprieteTexte("Analyse IA", "={{ $json.analyse }}"),
                        { key: "Transposable Anna|select", selectValue: "={{ $json.transposable }}" },
                    ],
                },
                options: {},
            },
            id: idStable("Maj Analyse Posts"),
            name: "Maj Analyse Posts",
            type: "n8n-nodes-base.notion",
            typeVersion: 2,
            position: [3300, 300],
        },
        noeudCode("Agreger Mail", CODE_AGREGER_MAIL, [2200, 500]),
        {
            parameters: {
                sendTo: "anna.ollivier.psy@gmail.com",
                subject: "={{ $json.sujet }}",
                message: "={{ $json.corps }}",
                options: {},
            },
            id: idStable("Gmail Rapport"),
            name: "Gmail Rapport",
            type: "n8n-nodes-base.gmail",
            typeVersion: 2.1,
            position: [2420, 500],
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
        // Ordre significatif : les créations d'abord, pour que la qualification
        // branchée après "Maj Comptes" voie des publications déjà écrites.
        Scorer: {
            main: [[
                { node: "Filtrer Creations", type: "main", index: 0 },
                { node: "Filtrer Majs", type: "main", index: 0 },
                { node: "Filtrer Comptes", type: "main", index: 0 },
            ]],
        },
        "Filtrer Creations": { main: [[{ node: "Creer Posts", type: "main", index: 0 }]] },
        "Filtrer Majs": { main: [[{ node: "Maj Posts", type: "main", index: 0 }]] },
        "Filtrer Comptes": { main: [[{ node: "Maj Comptes", type: "main", index: 0 }]] },
        // Qualification d'abord, rapport ensuite : le mail ne dépend pas des
        // analyses (il renvoie vers Notion), mais cet ordre évite qu'une panne
        // LLM ne retarde l'envoi.
        "Maj Comptes": {
            main: [[
                { node: "Lire Posts A Qualifier", type: "main", index: 0 },
                { node: "Agreger Mail", type: "main", index: 0 },
            ]],
        },
        "Lire Posts A Qualifier": { main: [[{ node: "Filtrer A Qualifier", type: "main", index: 0 }]] },
        "Filtrer A Qualifier": { main: [[{ node: "Build Prompt Qualification", type: "main", index: 0 }]] },
        "Build Prompt Qualification": { main: [[{ node: "Appel LLM", type: "main", index: 0 }]] },
        "Appel LLM": { main: [[{ node: "Parser Qualification", type: "main", index: 0 }]] },
        "Parser Qualification": { main: [[{ node: "Maj Analyse Posts", type: "main", index: 0 }]] },
        "Agreger Mail": { main: [[{ node: "Gmail Rapport", type: "main", index: 0 }]] },
    };

    return {
        name: "📈 Anna — Module D — Veille Performance Concurrents",
        nodes: noeuds,
        connections: connexions,
        settings: { executionOrder: "v1" },
    };
}
