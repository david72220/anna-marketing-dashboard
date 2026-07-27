export const TAILLE_BASELINE = 30;
export const ECHANTILLON_MINIMUM = 10;
export const SEUIL_SURPERFORMANCE = 1.5;

function valeurMetrique(post) {
    return post.metriqueScore === "Likes" ? Number(post.likes || 0) : Number(post.vues || 0);
}

export function moyenneReference(post, historique) {
    const pertinents = (historique || [])
        .filter(
            (h) =>
                h.postId !== post.postId &&
                h.handle === post.handle &&
                h.plateforme === post.plateforme &&
                h.metriqueScore === post.metriqueScore
        )
        .sort((a, b) => String(b.datePublication).localeCompare(String(a.datePublication)))
        .slice(0, TAILLE_BASELINE);

    if (pertinents.length === 0) return { moyenne: 0, echantillon: 0 };

    const total = pertinents.reduce((somme, h) => somme + valeurMetrique(h), 0);
    return {
        moyenne: Math.round((total / pertinents.length) * 100) / 100,
        echantillon: pertinents.length,
    };
}
