import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { genererLib, genererWorkflowJson } from "../../../scripts/build-n8n.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CHEMIN_LIB_GENEREE = join(ROOT, "n8n/module-d/lib.js");
const CHEMIN_WORKFLOW = join(ROOT, "n8n/module-d/workflow.json");

test("le fichier n8n/module-d/lib.js est à jour par rapport aux sources", () => {
    const attendu = genererLib();
    const actuel = readFileSync(CHEMIN_LIB_GENEREE, "utf8");
    assert.equal(
        actuel,
        attendu,
        "n8n/module-d/lib.js ne correspond plus aux sources (normalize.mjs / score.mjs). " +
        "Lancez `npm run build:n8n` puis committez le fichier régénéré."
    );
});

test("le fichier généré ne contient plus aucun export ni import", () => {
    const actuel = readFileSync(CHEMIN_LIB_GENEREE, "utf8");
    const lignes = actuel.split("\n");
    for (const ligne of lignes) {
        const t = ligne.trim();
        assert.equal(t.startsWith("export "), false, `ligne "export" résiduelle : ${ligne}`);
        assert.equal(t.startsWith("import "), false, `ligne "import" résiduelle : ${ligne}`);
    }
});

test("le fichier généré est du JavaScript valide, évaluable hors module (comme un nœud Code N8N)", () => {
    const actuel = readFileSync(CHEMIN_LIB_GENEREE, "utf8");
    assert.doesNotThrow(() => new Function(actuel));
});

test("le workflow n8n/module-d/workflow.json est à jour", () => {
    assert.equal(
        readFileSync(CHEMIN_WORKFLOW, "utf8"),
        genererWorkflowJson(),
        "n8n/module-d/workflow.json ne correspond plus à sa source. " +
        "Lancez `npm run build:n8n` puis committez le fichier régénéré."
    );
});

test("chaque nœud Code du workflow est du JavaScript valide hors module", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const noeudsCode = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.code");
    assert.ok(noeudsCode.length > 0, "aucun nœud Code trouvé dans le workflow");
    for (const noeud of noeudsCode) {
        assert.doesNotThrow(
            () => new Function(noeud.parameters.jsCode),
            `le nœud Code "${noeud.name}" ne parse pas`
        );
    }
});

test("les nœuds métier embarquent bien la logique testée", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const code = (nom) => workflow.nodes.find((n) => n.name === nom).parameters.jsCode;
    assert.match(code("Normaliser"), /function normaliserInstagram/);
    assert.match(code("Normaliser"), /function normaliserTikTok/);
    assert.match(code("Scorer"), /function calculerScore/);
    assert.match(code("Scorer"), /function repartir/);
});

test("le workflow ne contient aucun secret", () => {
    const brut = readFileSync(CHEMIN_WORKFLOW, "utf8");
    // Les appels Apify passent par un credential N8N, les clés LLM n'ont rien
    // à faire ici : un export de workflow finit dans git.
    for (const motif of [/sk-ant-/, /apify_api_/, /X-API-KEY["\s:]+[a-f0-9]{20}/i]) {
        assert.equal(motif.test(brut), false, `secret potentiel détecté : ${motif}`);
    }
});

test("toute connexion pointe vers un nœud existant", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const noms = new Set(workflow.nodes.map((n) => n.name));
    for (const [source, connexion] of Object.entries(workflow.connections)) {
        assert.ok(noms.has(source), `connexion depuis un nœud inexistant : ${source}`);
        for (const sortie of connexion.main) {
            for (const lien of sortie) {
                assert.ok(noms.has(lien.node), `connexion vers un nœud inexistant : ${lien.node}`);
            }
        }
    }
});

test("les identifiants de nœuds sont uniques", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const ids = workflow.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, "identifiants de nœuds en double");
});
