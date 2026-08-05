import { NextResponse } from "next/server";
import { enTetesWebhookN8N, webhookAuthConfiguree } from "@/lib/n8n";

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_DECOUVERTE;

export async function POST(request: Request) {
    // L'authentification est assurée par le middleware sur /api/*.
    try {
        const body = await request.json().catch(() => ({}));
        const hashtags = Array.isArray(body.hashtags)
            ? body.hashtags.filter((h: unknown) => typeof h === "string" && /^\w+$/.test(h)).slice(0, 5)
            : [];

        if (!N8N_WEBHOOK) {
            return NextResponse.json({ error: "Webhook N8N non configuré" }, { status: 500 });
        }
        if (!webhookAuthConfiguree()) {
            return NextResponse.json({ error: "Identifiants webhook non configurés" }, { status: 500 });
        }

        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: enTetesWebhookN8N(),
            body: JSON.stringify({ hashtags }),
            // Le workflow répond immédiatement puis continue en tâche de fond.
            signal: AbortSignal.timeout(30000),
        });

        if (!n8nRes.ok) {
            const errText = await n8nRes.text().catch(() => "");
            console.error("Erreur webhook découverte:", n8nRes.status, errText);
            return NextResponse.json({ error: "Erreur lors du lancement de la découverte" }, { status: 502 });
        }

        const data = await n8nRes.json().catch(() => ({}));
        return NextResponse.json({ success: true, ...data });
    } catch (error) {
        console.error("Erreur découverte concurrents:", error);
        return NextResponse.json({ error: "Erreur lors du lancement de la découverte" }, { status: 500 });
    }
}
