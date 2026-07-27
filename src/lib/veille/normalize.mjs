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

export function normaliserInstagram(items) {
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

export function normaliserTikTok(items) {
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

export function normaliser(plateforme, items) {
    if (plateforme === "Instagram") return normaliserInstagram(items);
    if (plateforme === "TikTok") return normaliserTikTok(items);
    return [];
}
