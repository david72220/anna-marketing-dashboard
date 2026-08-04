import { NextResponse } from "next/server";
import { getPage } from "@/lib/notion-write";
import { enTetesWebhookN8N, webhookAuthConfiguree } from "@/lib/n8n";

const VEILLE_DB = process.env.NOTION_VEILLE_DB_ID!;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_PROMPT;

interface NotionPage {
    id: string;
    parent?: { type?: string; database_id?: string };
}

function idNormalise(id: string): string {
    return id.replace(/-/g, "").toLowerCase();
}

export async function POST(request: Request) {
    // L'authentification est assurée par le middleware sur /api/*.
    // Le contrôle d'appartenance reste indispensable : sans lui, un identifiant
    // de page arbitraire ferait générer et écrire un prompt n'importe où.
    try {
        const { pageId } = await request.json();

        if (typeof pageId !== "string" || !/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pageId)) {
            return NextResponse.json({ error: "pageId invalide" }, { status: 400 });
        }

        if (!N8N_WEBHOOK) {
            return NextResponse.json({ error: "Webhook N8N non configuré" }, { status: 500 });
        }
        if (!webhookAuthConfiguree()) {
            return NextResponse.json({ error: "Identifiants webhook non configurés" }, { status: 500 });
        }

        const page = (await getPage(pageId)) as NotionPage | null;
        if (!page) {
            return NextResponse.json({ error: "Veille introuvable" }, { status: 404 });
        }
        const parentId = page.parent?.database_id || "";
        if (idNormalise(parentId) !== idNormalise(VEILLE_DB)) {
            return NextResponse.json({ error: "Veille hors périmètre" }, { status: 403 });
        }

        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: enTetesWebhookN8N(),
            body: JSON.stringify({ pageId: idNormalise(pageId) }),
            // La génération LLM prend 10 à 60 s : on laisse le temps au workflow.
            signal: AbortSignal.timeout(120000),
        });

        if (!n8nRes.ok) {
            const errText = await n8nRes.text().catch(() => "");
            console.error("Erreur webhook génération prompt:", n8nRes.status, errText);
            return NextResponse.json({ error: "Erreur lors de la génération du prompt" }, { status: 502 });
        }

        const data = await n8nRes.json().catch(() => ({}));
        if (!data.prompt) {
            return NextResponse.json({ error: "Réponse N8N sans prompt" }, { status: 502 });
        }

        return NextResponse.json({ success: true, prompt: data.prompt });
    } catch (error) {
        console.error("Erreur génération prompt veille:", error);
        return NextResponse.json({ error: "Erreur lors de la génération du prompt" }, { status: 500 });
    }
}
