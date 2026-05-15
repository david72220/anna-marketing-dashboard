import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_VEILLE_DB_ID!;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_VEILLE;

interface VeilleItem {
    id: string;
    title: string;
    concurrent: string;
    plateforme: string;
    typeContenu: string;
    performance: string;
    lecons: string;
    statut: string;
    date: string;
    createdTime: string;
}

async function fetchVeille(): Promise<VeilleItem[]> {
    const results = await queryDatabase(DB_ID);
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id as string,
            title: getPageTitle(page),
            concurrent: getPropertyText(props["Concurrent"] || {}),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            typeContenu: getPropertyText(props["Type Contenu"] || {}),
            performance: getPropertyText(props["Performance"] || {}),
            lecons: getPropertyText(props["Leçons"] || {}),
            statut: getPropertyText(props["Statut"] || {}),
            date: getPropertyText(props["Date"] || {}),
            createdTime: page.created_time as string,
        };
    });
}

export async function GET() {
    try {
        const veille = await fetchVeille();
        return NextResponse.json(veille);
    } catch (error) {
        console.error("Erreur Notion veille:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération de la veille" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt, concurrents, plateformes } = body;

        if (!N8N_WEBHOOK) {
            return NextResponse.json({ error: "Webhook N8N non configuré" }, { status: 500 });
        }

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
        }

        // Appeler le webhook N8N pour déclencher la veille concurrentielle
        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt.trim(),
                concurrents: concurrents || [],
                plateformes: plateformes || [],
            }),
        });

        if (!n8nRes.ok) {
            const errText = await n8nRes.text().catch(() => "");
            console.error("Erreur webhook N8N veille:", n8nRes.status, errText);
            return NextResponse.json({ error: "Erreur lors du déclenchement de la veille N8N" }, { status: 502 });
        }

        const n8nData = await n8nRes.json().catch(() => ({}));

        return NextResponse.json({
            success: true,
            message: "Veille concurrentielle lancée avec succès",
            status: "En cours",
            n8nResponse: n8nData,
        });
    } catch (error) {
        console.error("Erreur POST veille:", error);
        return NextResponse.json({ error: "Erreur lors du lancement de la veille" }, { status: 500 });
    }
}
