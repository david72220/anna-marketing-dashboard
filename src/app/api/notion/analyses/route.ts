import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_ANALYSES_DB_ID!;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_ANALYSES;

export async function GET() {
    try {
        const results = await queryDatabase(DB_ID);

        const analyses = results.map((page: Record<string, unknown>) => {
            const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
            return {
                id: page.id,
                title: getPageTitle(page),
                plateforme: getPropertyText(props["Plateforme"] || {}),
                scoreGlobal: getPropertyText(props["Score Global"] || {}),
                scoreHook: getPropertyText(props["Score Hook"] || {}),
                scoreCTA: getPropertyText(props["Score CTA"] || {}),
                scoreSEO: getPropertyText(props["Score SEO"] || {}),
                scoreEngagement: getPropertyText(props["Score Engagement"] || {}),
                pointsForts: getPropertyText(props["Points Forts"] || {}),
                axesAmelioration: getPropertyText(props["Axes Amelioration"] || {}),
                hookSuggere: getPropertyText(props["Hook Suggere"] || {}),
                hashtags: getPropertyText(props["Hashtags"] || {}),
                ecosystemeMotsCles: getPropertyText(props["Ecosystème Mots-clés"] || {}),
                resume: getPropertyText(props["Resume"] || {}),
                statut: getPropertyText(props["Statut"] || {}),
                dateAnalyse: getPropertyText(props["Date Analyse"] || {}),
                createdTime: page.created_time,
            };
        });

        // Trier par date d'analyse décroissante (plus récent en premier)
        analyses.sort((a: any, b: any) => {
            const dateA = a.dateAnalyse ? new Date(a.dateAnalyse).getTime() : 0;
            const dateB = b.dateAnalyse ? new Date(b.dateAnalyse).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json(analyses);
    } catch (error) {
        console.error("Erreur Notion analyses:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération des analyses" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networks, keywords } = body;

        if (!N8N_WEBHOOK) {
            return NextResponse.json({ error: "Webhook N8N non configuré" }, { status: 500 });
        }

        if (!networks || !Array.isArray(networks) || networks.length === 0) {
            return NextResponse.json({ error: "Aucun réseau sélectionné" }, { status: 400 });
        }

        // Mots-clés optionnels — laissés vides pour génération par N8N
        const kwList = Array.isArray(keywords) && keywords.length > 0 ? keywords : [];

        // Appeler le webhook N8N pour déclencher l'analyse
        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                networks,
                keywords: kwList,
                platforms: networks,
                prompt: `Analyse de contenu pour les réseaux : ${networks.join(", ")}.${kwList.length > 0 ? ` Mots-clés : ${kwList.join(", ")}.` : ""}`,
                youtubeApiKey: process.env.YOUTUBE_API_KEY || "",
                youtubeChannelId: process.env.ANNA_YOUTUBE_CHANNEL_ID || "",
            }),
        });

        if (!n8nRes.ok) {
            const errText = await n8nRes.text().catch(() => "");
            console.error("Erreur webhook N8N analyses:", n8nRes.status, errText);
            return NextResponse.json({ error: "Erreur lors du déclenchement de l'analyse N8N" }, { status: 502 });
        }

        const n8nData = await n8nRes.json().catch(() => ({}));

        return NextResponse.json({
            success: true,
            message: "Analyse lancée avec succès",
            status: "En cours",
            n8nResponse: n8nData,
        });
    } catch (error) {
        console.error("Erreur POST analyses:", error);
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        return NextResponse.json({ error: "Erreur lors du lancement de l'analyse", details: message }, { status: 500 });
    }
}
