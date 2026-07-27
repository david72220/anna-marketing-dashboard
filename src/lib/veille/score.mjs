export const TAILLE_BASELINE = 30;
export const ECHANTILLON_MINIMUM = 10;
export const SEUIL_SURPERFORMANCE = 1.5;

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

export function moyenneReference(post, historique) {
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

export function calculerScore(post, historique) {
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
