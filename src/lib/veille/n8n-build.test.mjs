import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { genererLib } from "../../../scripts/build-n8n.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CHEMIN_LIB_GENEREE = join(ROOT, "n8n/module-d/lib.js");

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
