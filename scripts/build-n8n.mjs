import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { genererWorkflow } from "./module-d-workflow.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
    "src/lib/veille/normalize.mjs",
    "src/lib/veille/score.mjs",
];

const SORTIE = "n8n/module-d/lib.js";
const SORTIE_WORKFLOW = "n8n/module-d/workflow.json";

function verifierAbsenceImport(contenu, chemin) {
    const lignes = contenu.split("\n");
    for (const ligne of lignes) {
        if (ligne.trim().startsWith("import ")) {
            throw new Error(
                `${chemin} contient une déclaration "import". ` +
                `Un nœud Code N8N ne peut pas résoudre d'import (pas de modules ES, pas de résolution de fichiers) : ` +
                `toute dépendance doit être inlinée directement dans le fichier source avant génération.`
            );
        }
    }
}

function retirerExport(contenu) {
    return contenu
        .split("\n")
        .map((ligne) => ligne.replace(/^(\s*)export\s+/, "$1"))
        .join("\n");
}

export function genererLib() {
    const blocs = [];

    for (const chemin of SOURCES) {
        const chemAbsolu = join(ROOT, chemin);
        const contenuBrut = readFileSync(chemAbsolu, "utf8");
        verifierAbsenceImport(contenuBrut, chemin);
        const contenu = retirerExport(contenuBrut).trimEnd();
        blocs.push(`// ---- Origine : ${chemin} ----\n${contenu}`);
    }

    const enTete = [
        "// Fichier généré automatiquement — NE JAMAIS ÉDITER À LA MAIN.",
        "// Régénérer avec : npm run build:n8n",
        "// Source de vérité : src/lib/veille/normalize.mjs et src/lib/veille/score.mjs,",
        "// couverts par leurs tests (npm test). Ce sont eux qui font foi, pas ce fichier.",
        "",
    ].join("\n");

    return `${enTete}\n${blocs.join("\n\n")}\n`;
}

function estExecutionDirecte() {
    if (!process.argv[1]) return false;
    return fileURLToPath(import.meta.url) === process.argv[1];
}

export function genererWorkflowJson() {
    return JSON.stringify(genererWorkflow(genererLib()), null, 2) + "\n";
}

if (estExecutionDirecte()) {
    const lib = genererLib();
    const cheminLib = join(ROOT, SORTIE);
    mkdirSync(dirname(cheminLib), { recursive: true });
    writeFileSync(cheminLib, lib, "utf8");
    console.log(`✔ ${SORTIE} généré (${lib.split("\n").length} lignes).`);

    const workflow = genererWorkflowJson();
    const cheminWorkflow = join(ROOT, SORTIE_WORKFLOW);
    writeFileSync(cheminWorkflow, workflow, "utf8");
    const nbNoeuds = JSON.parse(workflow).nodes.length;
    console.log(`✔ ${SORTIE_WORKFLOW} généré (${nbNoeuds} nœuds).`);
}
