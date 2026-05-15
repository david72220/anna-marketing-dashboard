import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_BACKLOG_DB_ID!;

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    typeContenu: string;
    sujet: string;
    angle: string;
    priorite: string;
    statut: string;
    datePublication: string;
    createdTime: string;
    motsCles: string;
}

async function fetchBacklog(): Promise<BacklogItem[]> {
    const results = await queryDatabase(DB_ID);
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id,
            title: getPageTitle(page),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            typeContenu: getPropertyText(props["Type Contenu"] || {}),
            sujet: getPropertyText(props["Sujet"] || {}),
            angle: getPropertyText(props["Angle"] || {}),
            priorite: getPropertyText(props["Priorité"] || {}),
            statut: getPropertyText(props["Statut"] || {}),
            datePublication: getPropertyText(props["Date Publication"] || {}),
            createdTime: page.created_time,
            motsCles: getPropertyText(props["Mots-clés"] || {}),
        };
    });
}

function scoreItem(item: BacklogItem, terms: string[]): number {
    const text = `${item.title} ${item.sujet} ${item.angle} ${item.motsCles} ${item.typeContenu} ${item.plateforme}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
        if (!term) continue;
        const t = term.toLowerCase();
        if (text.includes(t)) score += 1;
        // Bonus si le terme est dans le titre
        if (item.title.toLowerCase().includes(t)) score += 2;
        // Bonus si dans les mots-clés
        if (item.motsCles.toLowerCase().includes(t)) score += 1.5;
    }
    return score;
}

function generateSuggestions(items: BacklogItem[], prompt: string): unknown[] {
    const terms = prompt.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return items;

    const scored = items.map((item) => ({
        item,
        score: scoreItem(item, terms),
    }));

    scored.sort((a, b) => b.score - a.score);
    // Retourner les items avec un score > 0, ou tous si aucun match
    const withScore = scored.filter((s) => s.score > 0);
    return (withScore.length > 0 ? withScore : scored).map((s) => ({
        ...s.item,
        suggestionScore: Math.round(s.score * 10) / 10,
    }));
}

export async function GET() {
    try {
        const backlog = await fetchBacklog();
        return NextResponse.json(backlog);
    } catch (error) {
        console.error("Erreur Notion backlog:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération du backlog" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { prompt, questions } = (await request.json()) as { prompt?: string; questions?: string };
        const backlog = await fetchBacklog();

        if (!prompt || prompt.trim() === "") {
            return NextResponse.json(backlog);
        }

        // Appel au webhook N8N pour générer des suggestions via l'automatisation
        const webhookUrl = process.env.N8N_WEBHOOK_BACKLOG;
        let n8nResponse = null;

        if (webhookUrl) {
            try {
                const n8nRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        questions: questions || "",
                    }),
                });
                n8nResponse = await n8nRes.json().catch(() => ({ status: "triggered" }));
            } catch (webhookError) {
                console.error("Erreur webhook N8N backlog:", webhookError);
                // On continue avec le scoring local si le webhook échoue
            }
        }

        const suggestions = generateSuggestions(backlog, prompt);

        return NextResponse.json({
            prompt,
            questions: questions || "",
            count: suggestions.length,
            suggestions,
            status: "En cours",
            n8nResponse,
        });
    } catch (error) {
        console.error("Erreur suggestion backlog:", error);
        return NextResponse.json({ error: "Erreur lors de la génération des suggestions" }, { status: 500 });
    }
}
