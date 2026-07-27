import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normaliserInstagram } from "./normalize.mjs";

const igRun = JSON.parse(readFileSync(new URL("./fixtures/instagram-run.json", import.meta.url)));

test("normaliserInstagram produit le schéma unique", () => {
    const posts = normaliserInstagram(igRun);
    assert.ok(posts.length > 0);
    for (const p of posts) {
        assert.equal(typeof p.postId, "string");
        assert.equal(p.plateforme, "Instagram");
        assert.equal(p.handle, p.handle.toLowerCase());
        assert.ok(["Reel", "Carrousel", "Photo"].includes(p.type));
        assert.ok(["Vues", "Likes"].includes(p.metriqueScore));
        assert.equal(typeof p.vues, "number");
        assert.equal(typeof p.likes, "number");
        assert.equal(typeof p.commentaires, "number");
        assert.ok(p.datePublication.includes("T"));
    }
});

test("un Reel est scoré sur les vues, un carrousel et une photo sur les likes", () => {
    const posts = normaliserInstagram(igRun);
    for (const p of posts) {
        if (p.type === "Reel") assert.equal(p.metriqueScore, "Vues");
        else assert.equal(p.metriqueScore, "Likes");
    }
});

test("la fixture contient bien les deux types réels attendus", () => {
    const types = new Set(normaliserInstagram(igRun).map((p) => p.type));
    assert.ok(types.has("Reel"));
    assert.ok(types.has("Carrousel"));
});

test("un carrousel sans compteur de vues donne vues = 0, jamais NaN", () => {
    const posts = normaliserInstagram(igRun).filter((p) => p.type === "Carrousel");
    assert.ok(posts.length > 0);
    for (const p of posts) {
        assert.equal(p.vues, 0);
        assert.equal(Number.isNaN(p.vues), false);
    }
});

test("videoPlayCount est préféré à videoViewCount", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Video", productType: "clips", ownerUsername: "X", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "c", videoPlayCount: 193, videoViewCount: 18 },
    ]);
    assert.equal(posts[0].vues, 193);
});

test("videoViewCount sert de repli quand videoPlayCount est absent", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Video", productType: "clips", ownerUsername: "X", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "c", videoViewCount: 18 },
    ]);
    assert.equal(posts[0].vues, 18);
});

test("une photo simple est de type Photo et scorée sur les likes", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Image", ownerUsername: "X", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 42, commentsCount: 3, caption: "c" },
    ]);
    assert.equal(posts[0].type, "Photo");
    assert.equal(posts[0].metriqueScore, "Likes");
    assert.equal(posts[0].vues, 0);
});

test("le handle est mis en minuscules et débarrassé du @", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Image", ownerUsername: "@Anna.Ollivier.PSY", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "c" },
    ]);
    assert.equal(posts[0].handle, "anna.ollivier.psy");
});

test("l'accroche est tronquée à 80 caractères", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Image", ownerUsername: "X", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "a".repeat(200) },
    ]);
    assert.equal(posts[0].accroche.length, 80);
});

test("une légende vide donne une accroche de repli", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Image", ownerUsername: "X", url: "u", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "" },
    ]);
    assert.equal(posts[0].accroche, "(sans légende)");
});

test("l'URL est reconstruite depuis shortCode si url est absente", () => {
    const posts = normaliserInstagram([
        { id: "1", type: "Image", shortCode: "ABC123", ownerUsername: "X", timestamp: "2026-07-01T00:00:00.000Z", likesCount: 1, commentsCount: 0, caption: "c" },
    ]);
    assert.equal(posts[0].url, "https://www.instagram.com/p/ABC123/");
});

test("les éléments sans identifiant sont écartés", () => {
    assert.equal(normaliserInstagram([{ type: "Image", ownerUsername: "X" }]).length, 0);
});

test("une entrée non tableau ou mal formée ne lève pas", () => {
    assert.deepEqual(normaliserInstagram(null), []);
    assert.deepEqual(normaliserInstagram(undefined), []);
    assert.deepEqual(normaliserInstagram("pas un tableau"), []);
    assert.deepEqual(normaliserInstagram([null, 42, "x"]), []);
});
