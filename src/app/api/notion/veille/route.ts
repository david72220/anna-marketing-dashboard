import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_VEILLE_DB_ID!;
const ANALYSES_DB_ID = process.env.NOTION_ANALYSES_DB_ID!;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_VEILLE;

interface VeilleItem {
    id: string;
    title: string;
    themesDominants: string;
    anglesNonExploites: string;
    formatsPerformants: string;
    motsCles: string;
    concurrents: string;
    recommandations: string;
    resume: string;
    dateVeille: string;
    statut: string;
    plateforme: string;
    pointsFortsConcurrents: string;
    produitsConcurrents: string;
    positionnementAnna: string;
    motsClesUtilises: string;
    createdTime: string;
}

async function fetchVeille(): Promise<VeilleItem[]> {
    const results = await queryDatabase(DB_ID);
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id as string,
            title: getPageTitle(page),
            themesDominants: getPropertyText(props["Themes Dominants"] || {}),
            anglesNonExploites: getPropertyText(props["Angles Non Exploites"] || {}),
            formatsPerformants: getPropertyText(props["Formats Performants"] || {}),
            motsCles: getPropertyText(props["Mots Cles"] || {}),
            concurrents: getPropertyText(props["Concurrents"] || {}),
            recommandations: getPropertyText(props["Recommandations"] || {}),
            resume: getPropertyText(props["Resume"] || {}),
            dateVeille: getPropertyText(props["Date Veille"] || {}),
            statut: getPropertyText(props["Statut"] || {}),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            pointsFortsConcurrents: getPropertyText(props["Points Forts Concurrents"] || {}),
            produitsConcurrents: getPropertyText(props["Produits Concurrents"] || {}),
            positionnementAnna: getPropertyText(props["Positionnement Anna"] || {}),
            motsClesUtilises: getPropertyText(props["Mots Cles Utilises"] || {}),
            createdTime: page.created_time as string,
        };
    });
}

async function extractKeywordsFromAnalyses(): Promise<string[]> {
    if (!ANALYSES_DB_ID) return [];
    try {
        const results = await queryDatabase(ANALYSES_DB_ID);
        const allKeywords: string[] = [];

        for (const page of results) {
            const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
            const ecoText = getPropertyText(props["Ecosystème Mots-clés"] || props["Ecosysteme Mots-cles"] || {});
            if (ecoText) {
                ecoText.split(",").forEach((k: string) => {
                    const trimmed = k.trim();
                    if (trimmed) allKeywords.push(trimmed);
                });
            }
            const hashText = getPropertyText(props["Hashtags"] || {});
            if (hashText) {
                hashText.split(/[#,\s]+/).forEach((h: string) => {
                    const trimmed = h.trim().replace(/^#/, "");
                    if (trimmed && trimmed.length > 2) allKeywords.push(trimmed);
                });
            }
        }

        const unique = [...new Set(allKeywords)];
        return unique.slice(0, 15);
    } catch {
        return [];
    }
}

export async function GET() {
    try {
        const veille = await fetchVeille();
        return NextResponse.json(veille, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
        });
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

        // Extract keywords from recent analyses to enrich the veille
        const keywords = await extractKeywordsFromAnalyses();

        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt?.trim() || "",
                concurrents: concurrents || [],
                plateformes: plateformes || ["YouTube", "TikTok", "Instagram"],
                keywords,
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
            keywords,
            n8nResponse: n8nData,
        });
    } catch (error) {
        console.error("Erreur POST veille:", error);
        return NextResponse.json({ error: "Erreur lors du lancement de la veille" }, { status: 500 });
    }
}