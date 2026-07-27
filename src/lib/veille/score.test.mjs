import { test } from "node:test";
import assert from "node:assert/strict";
import { moyenneReference } from "./score.mjs";

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
