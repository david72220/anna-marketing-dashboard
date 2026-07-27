// Fichier généré automatiquement — NE JAMAIS ÉDITER À LA MAIN.
// Régénérer avec : npm run build:n8n
// Source de vérité : src/lib/veille/normalize.mjs et src/lib/veille/score.mjs,
// couverts par leurs tests (npm test). Ce sont eux qui font foi, pas ce fichier.

// ---- Origine : src/lib/veille/normalize.mjs ----
const ACCROCHE_MAX = 80;

function accrocheDepuis(legende) {
    const texte = String(legende || "").replace(/\s+/g, " ").trim();
    if (!texte) return "(sans légende)";
    return texte.slice(0, ACCROCHE_MAX);
}

function entier(valeur) {
    const n = parseInt(String(valeur ?? "0"), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function typeInstagram(item) {
    if (item.type === "Sidecar") return "Carrousel";
    if (item.type === "Video" || item.productType === "clips") return "Reel";
    return "Photo";
}

function normaliserInstagram(items) {
    if (!Array.isArray(items)) return [];
    const resultat = [];
    for (const item of items) {
        if (!item || typeof item !== "object" || !item.id) continue;
        const type = typeInstagram(item);
        resultat.push({
            postId: String(item.id),
            plateforme: "Instagram",
            handle: String(item.ownerUsername || "").toLowerCase().replace("@", ""),
            url: item.url || (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : ""),
            datePublication: item.timestamp || "",
            type,
            accroche: accrocheDepuis(item.caption),
            legende: String(item.caption || ""),
            vues: entier(item.videoPlayCount ?? item.videoViewCount),
            likes: entier(item.likesCount),
            commentaires: entier(item.commentsCount),
            metriqueScore: type === "Reel" ? "Vues" : "Likes",
        });
    }
    return resultat;
}

function normaliserTikTok(items) {
    if (!Array.isArray(items)) return [];
    const resultat = [];
    for (const item of items) {
        if (!item || typeof item !== "object" || !item.id) continue;
        const auteur = item.authorMeta || {};
        resultat.push({
            postId: String(item.id),
            plateforme: "TikTok",
            handle: String(auteur.name || item.uniqueId || "").toLowerCase().replace("@", ""),
            url: item.webVideoUrl || "",
            datePublication: item.createTimeISO || "",
            type: "TikTok",
            accroche: accrocheDepuis(item.text),
            legende: String(item.text || ""),
            vues: entier(item.playCount),
            likes: entier(item.diggCount),
            commentaires: entier(item.commentCount),
            metriqueScore: "Vues",
        });
    }
    return resultat;
}

function normaliser(plateforme, items) {
    if (plateforme === "Instagram") return normaliserInstagram(items);
    if (plateforme === "TikTok") return normaliserTikTok(items);
    return [];
}

// ---- Origine : src/lib/veille/score.mjs ----
const TAILLE_BASELINE = 30;
const ECHANTILLON_MINIMUM = 10;
const SEUIL_SURPERFORMANCE = 1.5;

// Notion peut renvoyer la métrique avec une casse quelconque ; toute valeur
// inconnue retombe sur les vues, qui est le cas majoritaire.
function metriqueNormalisee(post) {
    return String(post?.metriqueScore || "").trim().toLowerCase() === "likes" ? "Likes" : "Vues";
}

// Retourne null — et non 0 — quand la valeur est absente ou illisible, pour que
// l'entrée soit écartée de l'échantillon au lieu de le diluer.
function valeurMetrique(post) {
    const brut = metriqueNormalisee(post) === "Likes" ? post?.likes : post?.vues;
    if (brut === null || brut === undefined || brut === "") return null;
    const n = Number(brut);
    return Number.isFinite(n) ? n : null;
}

function instant(post) {
    const t = Date.parse(post?.datePublication);
    return Number.isNaN(t) ? null : t;
}

function moyenneReference(post, historique) {
    const vide = { moyenne: 0, echantillon: 0 };
    if (!post || typeof post !== "object") return vide;

    const metrique = metriqueNormalisee(post);
    const vus = new Set();
    const pertinents = [];

    for (const h of Array.isArray(historique) ? historique : []) {
        if (!h || typeof h !== "object") continue;
        if (post.postId && h.postId === post.postId) continue;
        if (h.handle !== post.handle) continue;
        if (h.plateforme !== post.plateforme) continue;
        if (metriqueNormalisee(h) !== metrique) continue;

        const t = instant(h);
        if (t === null) continue;

        const valeur = valeurMetrique(h);
        if (valeur === null) continue;

        const cle = h.postId || `${h.url || ""}|${t}`;
        if (vus.has(cle)) continue;
        vus.add(cle);

        pertinents.push({ t, valeur });
    }

    if (pertinents.length === 0) return vide;

    pertinents.sort((a, b) => b.t - a.t);
    const retenus = pertinents.slice(0, TAILLE_BASELINE);

    const total = retenus.reduce((somme, p) => somme + p.valeur, 0);
    return {
        moyenne: Math.round((total / retenus.length) * 100) / 100,
        echantillon: retenus.length,
    };
}

function calculerScore(post, historique) {
    const { moyenne, echantillon } = moyenneReference(post, historique);
    const fiable = echantillon >= ECHANTILLON_MINIMUM;
    const valeur = valeurMetrique(post);

    if (valeur === null || !(moyenne > 0)) {
        return { score: null, moyenne, echantillon, fiable: false, surperforme: false };
    }

    const score = Math.round((valeur / moyenne) * 100) / 100;

    return {
        score,
        moyenne,
        echantillon,
        fiable,
        surperforme: fiable && score >= SEUIL_SURPERFORMANCE,
    };
}

function repartir(collectes, pagesParPostId) {
    const creations = [];
    const majs = [];
    const vus = new Set();
    const pages = pagesParPostId && typeof pagesParPostId === "object" ? pagesParPostId : {};

    for (const post of Array.isArray(collectes) ? collectes : []) {
        if (!post || typeof post !== "object") continue;
        if (!post.postId) continue;
        if (vus.has(post.postId)) continue;
        vus.add(post.postId);

        const pageId = pages[post.postId];
        if (pageId) majs.push({ post, pageId });
        else creations.push(post);
    }

    return { creations, majs };
}
