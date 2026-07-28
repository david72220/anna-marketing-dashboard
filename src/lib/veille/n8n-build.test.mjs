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

// N8N enveloppe le corps d'un nœud Code dans une fonction asynchrone : `await`
// au niveau supérieur y est légal. Compiler avec AsyncFunction plutôt qu'avec
// Function reproduit l'environnement réel — sinon la cascade LLM, qui attend
// ses appels HTTP, serait signalée à tort comme invalide.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test("chaque nœud Code du workflow compile comme un nœud Code N8N", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const noeudsCode = workflow.nodes.filter((n) => n.type === "n8n-nodes-base.code");
    assert.ok(noeudsCode.length > 0, "aucun nœud Code trouvé dans le workflow");
    for (const noeud of noeudsCode) {
        assert.doesNotThrow(
            () => new AsyncFunction(noeud.parameters.jsCode),
            `le nœud Code "${noeud.name}" ne parse pas`
        );
    }
});

test("l'appel LLM vise l'Ollama interne et n'exige aucun secret", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));

    // Un nœud Code N8N ne peut ni lire $env ni utiliser
    // httpRequestWithAuthentication : y appeler une API authentifiée
    // imposerait d'écrire la clé en dur, et un export de workflow est versionné.
    for (const noeud of workflow.nodes.filter((n) => n.type === "n8n-nodes-base.code")) {
        assert.equal(
            /api\.anthropic\.com|api\.openai\.com/.test(noeud.parameters.jsCode),
            false,
            `le nœud Code "${noeud.name}" appelle une API LLM externe : cet appel doit passer par un nœud HTTP Request`
        );
    }

    const appel = workflow.nodes.find((n) => n.name === "Appel LLM");
    assert.ok(appel, "nœud Appel LLM absent");
    assert.equal(appel.type, "n8n-nodes-base.httpRequest");
    // Réseau Docker interne : ni credential, ni en-tête d'authentification.
    assert.match(appel.parameters.url, /^http:\/\/172\.18\.0\.1:11434\//);
    assert.equal(appel.parameters.authentication, undefined);
    assert.equal(appel.parameters.sendHeaders, undefined);
});

test("l'appel LLM désactive le thinking", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const appel = workflow.nodes.find((n) => n.name === "Appel LLM");
    // Sur un modèle de raisonnement, sans think: false le budget num_predict
    // part entièrement dans le raisonnement et message.content revient vide.
    assert.match(appel.parameters.jsonBody, /think:\s*false/);
});

test("le parseur lit la réponse au format Ollama", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const parseur = workflow.nodes.find((n) => n.name === "Parser Qualification");
    assert.match(parseur.parameters.jsCode, /j\.message && j\.message\.content/);
});

test("le webhook est authentifié et répond immédiatement", () => {
    const workflow = JSON.parse(readFileSync(CHEMIN_WORKFLOW, "utf8"));
    const webhook = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
    assert.ok(webhook, "nœud Webhook absent");

    // Un webhook ouvert laisse n'importe qui brûler les crédits Apify et le
    // quota Ollama, et écrire dans Notion. L'authentification passe par un
    // credential, jamais par un token en dur dans un nœud Code.
    assert.equal(webhook.parameters.authentication, "headerAuth");

    // La collecte dure 90 à 130 s : tenir la connexion ouverte dépasserait le
    // délai d'une fonction serverless Vercel côté dashboard.
    // Seules onReceived | lastNode | responseNode sont valides : toute autre
    // valeur est supprimée en silence par N8N à l'import, et la requête reste
    // alors sans réponse jusqu'au timeout du client.
    assert.ok(
        ["onReceived", "lastNode", "responseNode"].includes(webhook.parameters.responseMode),
        `responseMode invalide : ${webhook.parameters.responseMode}`
    );
    assert.equal(webhook.parameters.responseMode, "onReceived");
    assert.equal(
        workflow.nodes.some((n) => n.type === "n8n-nodes-base.respondToWebhook"),
        false,
        "respondToWebhook est inutile avec responseMode immediately"
    );
});

test("aucun secret ni emplacement à remplir à la main dans le workflow", () => {
    const brut = readFileSync(CHEMIN_WORKFLOW, "utf8");
    for (const motif of [/sk-ant-/, /A_RENSEIGNER/, /x-api-key/i, /apify_api_/]) {
        assert.equal(motif.test(brut), false, `motif interdit détecté : ${motif}`);
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
