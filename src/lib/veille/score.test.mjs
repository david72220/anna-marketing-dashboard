import { test } from "node:test";
import assert from "node:assert/strict";
import { moyenneReference, calculerScore, repartir, SEUIL_SURPERFORMANCE } from "./score.mjs";

function post(id, options = {}) {
    return {
        postId: id,
        handle: options.handle || "concurrent1",
        plateforme: options.plateforme || "Instagram",
        metriqueScore: options.metriqueScore || "Vues",
        vues: options.vues ?? 1000,
        likes: options.likes ?? 100,
        datePublication: options.date || "2026-07-01T00:00:00.000Z",
    };
}

test("la moyenne exclut le post évalué", () => {
    const historique = [post("a", { vues: 100 }), post("b", { vues: 200 }), post("c", { vues: 3000 })];
    const r = moyenneReference(post("c", { vues: 3000 }), historique);
    assert.equal(r.moyenne, 150);
    assert.equal(r.echantillon, 2);
});

test("la moyenne ne mélange pas les métriques", () => {
    const historique = [
        post("a", { metriqueScore: "Vues", vues: 1000 }),
        post("b", { metriqueScore: "Likes", likes: 50 }),
        post("c", { metriqueScore: "Likes", likes: 150 }),
    ];
    const r = moyenneReference(post("z", { metriqueScore: "Likes", likes: 999 }), historique);
    assert.equal(r.moyenne, 100);
    assert.equal(r.echantillon, 2);
});

test("la moyenne ne mélange pas les comptes ni les plateformes", () => {
    const historique = [
        post("a", { handle: "concurrent1", vues: 100 }),
        post("b", { handle: "concurrent2", vues: 9000 }),
        post("c", { handle: "concurrent1", plateforme: "TikTok", vues: 9000 }),
    ];
    const r = moyenneReference(post("z", { handle: "concurrent1" }), historique);
    assert.equal(r.moyenne, 100);
    assert.equal(r.echantillon, 1);
});

test("la moyenne ne retient que les 30 posts les plus récents", () => {
    // 40 posts, du plus ancien au plus récent.
    // Les 10 plus ANCIENS sont des valeurs aberrantes : ils doivent être écartés.
    const historique = [];
    for (let i = 0; i < 40; i++) {
        historique.push(
            post(`p${i}`, {
                vues: i < 10 ? 100000 : 100,
                date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
            })
        );
    }
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.echantillon, 30);
    assert.equal(r.moyenne, 100);
});

test("un historique vide donne une moyenne nulle", () => {
    const r = moyenneReference(post("z"), []);
    assert.equal(r.moyenne, 0);
    assert.equal(r.echantillon, 0);
});

test("une entrée avec la métrique à null est exclue de la moyenne et de l'échantillon", () => {
    const historique = [
        post("a", { vues: 100 }),
        post("b", { vues: 120 }),
        {
            postId: "c",
            handle: "concurrent1",
            plateforme: "Instagram",
            metriqueScore: "Vues",
            vues: null,
            likes: 0,
            datePublication: "2026-07-03T00:00:00.000Z",
        },
        {
            postId: "d",
            handle: "concurrent1",
            plateforme: "Instagram",
            metriqueScore: "Vues",
            vues: null,
            likes: 0,
            datePublication: "2026-07-04T00:00:00.000Z",
        },
    ];
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.moyenne, 110);
    assert.equal(r.echantillon, 2);
});

test("une valeur non numérique est exclue et la moyenne n'est jamais NaN", () => {
    const historique = [
        post("a", { vues: 100 }),
        {
            postId: "b",
            handle: "concurrent1",
            plateforme: "Instagram",
            metriqueScore: "Vues",
            vues: "beaucoup",
            likes: 0,
            datePublication: "2026-07-02T00:00:00.000Z",
        },
    ];
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.moyenne, 100);
    assert.equal(r.echantillon, 1);
    assert.equal(Number.isNaN(r.moyenne), false);
});

test("les entrées sans date exploitable sont exclues et n'entrent pas dans la fenêtre de 30", () => {
    const historique = [];
    for (let i = 0; i < 30; i++) {
        historique.push(
            post(`p${i}`, {
                vues: 100,
                date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
            })
        );
    }
    historique.push({
        postId: "nodate1",
        handle: "concurrent1",
        plateforme: "Instagram",
        metriqueScore: "Vues",
        vues: 999999,
        likes: 0,
        datePublication: null,
    });
    historique.push({
        postId: "nodate2",
        handle: "concurrent1",
        plateforme: "Instagram",
        metriqueScore: "Vues",
        vues: 999999,
        likes: 0,
        datePublication: undefined,
    });
    historique.push({
        postId: "nodate3",
        handle: "concurrent1",
        plateforme: "Instagram",
        metriqueScore: "Vues",
        vues: 999999,
        likes: 0,
    });
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.echantillon, 30);
    assert.equal(r.moyenne, 100);
});

test("des instants identiques ou proches dans des fuseaux différents sont ordonnés par instant réel", () => {
    // 29 posts de remplissage, tous plus RÉCENTS que X et Y (août, vues=100).
    // Comme ils occupent déjà 29 des 30 places du top, il ne reste qu'UNE place
    // disputée entre X et Y : le test isole ainsi lequel des deux est retenu.
    const historique = [];
    for (let d = 1; d <= 29; d++) {
        historique.push(
            post(`filler${d}`, {
                vues: 100,
                date: new Date(Date.UTC(2026, 7, d)).toISOString(),
            })
        );
    }
    // X : écrit avec un décalage +14:00 qui le fait paraître "plus récent" en tri
    // de chaînes (le "23" bat le "10" lexicographiquement), alors que son instant
    // réel (09:00 UTC) est ANTÉRIEUR à celui de Y.
    historique.push(post("x", { vues: 500, date: "2026-07-31T23:00:00.000+14:00" }));
    // Y : instant réel 10:00 UTC le même jour, donc réellement plus récent que X.
    historique.push(post("y", { vues: 700, date: "2026-07-31T10:00:00.000Z" }));

    const r = moyenneReference(post("z"), historique);
    // Le tri correct (par instant) retient Y (700) et exclut X (500) :
    // moyenne = (29*100 + 700) / 30 = 120.
    assert.equal(r.echantillon, 30);
    assert.equal(r.moyenne, 120);
});

test("un mélange de date seule et d'ISO complet est accepté et pris en compte", () => {
    const historique = [
        post("dateonly", { vues: 300, date: "2026-07-10" }),
        post("early", { vues: 100, date: "2026-07-09T23:00:00.000Z" }),
        post("late", { vues: 500, date: "2026-07-10T01:00:00.000Z" }),
    ];
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.echantillon, 3);
    assert.equal(r.moyenne, 300);
});

test("metriqueScore insensible à la casse pour l'évalué comme pour l'historique", () => {
    const historique = [
        post("a", { metriqueScore: "LIKES", likes: 40 }),
        post("b", { metriqueScore: "likes", likes: 60 }),
        post("c", { metriqueScore: "Vues", vues: 999 }),
    ];
    const r = moyenneReference(post("z", { metriqueScore: "likes" }), historique);
    assert.equal(r.moyenne, 50);
    assert.equal(r.echantillon, 2);
});

test("la même publication en double sous le même postId n'est comptée qu'une fois", () => {
    const dup = post("a", { vues: 200 });
    const historique = [dup, { ...dup }, post("b", { vues: 400 })];
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.moyenne, 300);
    assert.equal(r.echantillon, 2);
});

test("un post évalué undefined ou null ne lève pas d'exception", () => {
    assert.deepEqual(moyenneReference(undefined, [post("a")]), { moyenne: 0, echantillon: 0 });
    assert.deepEqual(moyenneReference(null, [post("a")]), { moyenne: 0, echantillon: 0 });
});

test("un historique contenant des entrées mal formées ne fait pas échouer la fonction", () => {
    const historique = [null, undefined, 42, "string", {}, post("a", { vues: 100 })];
    const r = moyenneReference(post("z"), historique);
    assert.equal(r.moyenne, 100);
    assert.equal(r.echantillon, 1);
});

test("le score est la métrique divisée par la moyenne de référence", () => {
    const historique = [post("a", { vues: 1000 }), post("b", { vues: 1000 })];
    const r = calculerScore(post("c", { vues: 3000 }), historique);
    assert.equal(r.score, 3);
});

test("le score est arrondi à deux décimales", () => {
    const historique = [post("a", { vues: 3000 })];
    const r = calculerScore(post("b", { vues: 1000 }), historique);
    assert.equal(r.score, 0.33);
});

test("un post viral ne s'écrase pas lui-même dans sa propre moyenne", () => {
    const viral = post("viral", { vues: 50000, date: "2026-07-13T00:00:00.000Z" });
    const historique = [];
    for (let i = 0; i < 12; i++) {
        historique.push(
            post(`filler${i}`, { vues: 500, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString() })
        );
    }
    historique.push(viral);

    const r = calculerScore(viral, historique);
    assert.equal(r.score, 100);
    assert.equal(r.fiable, true);
    assert.equal(r.surperforme, true);
});

test("une moyenne nulle ne produit pas de score", () => {
    const r = calculerScore(post("z"), []);
    assert.equal(r.score, null);
    assert.equal(r.surperforme, false);
    assert.equal(r.fiable, false);
});

test("un échantillon inférieur à 10 est marqué non fiable et ne surperforme jamais", () => {
    const historique = [post("a", { vues: 10 }), post("b", { vues: 10 })];
    const r = calculerScore(post("z", { vues: 10000 }), historique);
    assert.equal(r.score, 1000);
    assert.equal(r.fiable, false);
    assert.equal(r.surperforme, false);
});

test("un échantillon suffisant au-dessus du seuil surperforme", () => {
    const historique = [];
    for (let i = 0; i < 12; i++) {
        historique.push(post(`p${i}`, { vues: 1000, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString() }));
    }
    const r = calculerScore(post("z", { vues: 1000 * SEUIL_SURPERFORMANCE }), historique);
    assert.equal(r.fiable, true);
    assert.equal(r.surperforme, true);
});

test("un échantillon suffisant juste en dessous du seuil ne surperforme pas", () => {
    const historique = [];
    for (let i = 0; i < 12; i++) {
        historique.push(post(`p${i}`, { vues: 1000, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString() }));
    }
    const r = calculerScore(post("z", { vues: 1494 }), historique);
    assert.equal(r.surperforme, false);
});

test("un score exactement au seuil surperforme (comparaison sur le score arrondi)", () => {
    const historique = [];
    for (let i = 0; i < 12; i++) {
        historique.push(post(`p${i}`, { vues: 1000, date: new Date(Date.UTC(2026, 6, 1 + i)).toISOString() }));
    }
    const r = calculerScore(post("z", { vues: 1500 }), historique);
    assert.equal(r.score, 1.5);
    assert.equal(r.surperforme, true);
});

test("un post dont la métrique vaut null donne un score null sans produire NaN", () => {
    const sansValeur = {
        postId: "noval",
        handle: "concurrent1",
        plateforme: "Instagram",
        metriqueScore: "Vues",
        vues: null,
        likes: 0,
        datePublication: "2026-07-05T00:00:00.000Z",
    };
    const historique = [post("a", { vues: 100 }), post("b", { vues: 120 })];
    const r = calculerScore(sansValeur, historique);
    assert.equal(r.score, null);
    assert.equal(Number.isNaN(r.score), false);
});

test("calculerScore sur un post undefined ou null ne lève pas d'exception", () => {
    const r1 = calculerScore(undefined, []);
    const r2 = calculerScore(null, []);
    assert.equal(r1.score, null);
    assert.equal(r2.score, null);
});

test("repartir : les publications inconnues vont en création, les connues en mise à jour", () => {
    const a = post("a");
    const b = post("b");
    const c = post("c");
    const r = repartir([a, b, c], { b: "page-b", c: "page-c" });

    assert.deepEqual(r.creations, [a]);
    assert.equal(r.majs.length, 2);
    assert.equal(r.majs[0].pageId, "page-b");
    assert.equal(r.majs[0].post, b);
    assert.equal(r.majs[1].pageId, "page-c");
});

test("repartir : un lot vide ne produit rien", () => {
    const r = repartir([], { b: "page-b" });
    assert.deepEqual(r.creations, []);
    assert.deepEqual(r.majs, []);
});

test("repartir : les doublons à l'intérieur d'un même lot sont écartés (création)", () => {
    const a = post("a");
    const r = repartir([a, { ...a }], {});
    assert.equal(r.creations.length, 1);
    assert.equal(r.majs.length, 0);
});

test("repartir : un doublon intra-lot d'une publication déjà connue ne produit qu'une seule mise à jour", () => {
    const a = post("a");
    const r = repartir([a, { ...a }], { a: "page-a" });
    assert.equal(r.creations.length, 0);
    assert.equal(r.majs.length, 1);
    assert.equal(r.majs[0].pageId, "page-a");
});

test("repartir : les entrées null, non-objets, ou sans postId sont ignorées sans lever", () => {
    const a = post("a");
    const r = repartir([null, undefined, 42, "string", {}, { handle: "x" }, a], { b: "page-b" });
    assert.deepEqual(r.creations, [a]);
    assert.deepEqual(r.majs, []);
});

test("repartir : appelée avec undefined ou null ne lève pas d'exception", () => {
    assert.deepEqual(repartir(undefined, undefined), { creations: [], majs: [] });
    assert.deepEqual(repartir(null, null), { creations: [], majs: [] });
});

test("repartir : l'ordre du lot est préservé dans creations", () => {
    const a = post("a");
    const b = post("b");
    const c = post("c");
    const r = repartir([c, a, b], {});
    assert.deepEqual(r.creations, [c, a, b]);
});
