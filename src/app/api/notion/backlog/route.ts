import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";
import { enTetesWebhookN8N } from "@/lib/n8n";

const DB_ID = process.env.NOTION_BACKLOG_DB_ID!;

interface BacklogItem {
    id: string;
    title: string;
    plateforme: string;
    format: string;
    hook: string;
    problemeCible: string;
    messageCle: string;
    solution: string;
    cta: string;
    hashtags: string;
    priorite: string;
    statut: string;
    dateGeneration: string;
    createdTime: string;
}

async function fetchBacklog(): Promise<BacklogItem[]> {
    const results = await queryDatabase(DB_ID);
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id as string,
            title: getPageTitle(page),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            format: getPropertyText(props["Format"] || {}),
            hook: getPropertyText(props["Hook"] || {}),
            problemeCible: getPropertyText(props["Probleme Cible"] || {}),
            messageCle: getPropertyText(props["Message Cle"] || {}),
            solution: getPropertyText(props["Solution"] || {}),
            cta: getPropertyText(props["CTA"] || {}),
            hashtags: getPropertyText(props["Hashtags"] || {}),
            priorite: getPropertyText(props["Priorite"] || {}),
            statut: getPropertyText(props["Statut"] || {}),
            dateGeneration: getPropertyText(props["Date Generation"] || {}),
            createdTime: page.created_time as string,
        };
    });
}

function scoreItem(item: BacklogItem, terms: string[]): number {
    const text = `${item.title} ${item.hook} ${item.problemeCible} ${item.messageCle} ${item.solution} ${item.hashtags} ${item.plateforme} ${item.format}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
        if (!term) continue;
        const t = term.toLowerCase();
        if (text.includes(t)) score += 1;
        if (item.title.toLowerCase().includes(t)) score += 2;
        if (item.hashtags.toLowerCase().includes(t)) score += 1.5;
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
    const withScore = scored.filter((s) => s.score > 0);
    return (withScore.length > 0 ? withScore : scored).map((s) => ({
        ...s.item,
        suggestionScore: Math.round(s.score * 10) / 10,
    }));
}

export async function GET() {
    try {
        const backlog = await fetchBacklog();
        return NextResponse.json(backlog, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
        });
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

        const webhookUrl = process.env.N8N_WEBHOOK_BACKLOG;
        let n8nResponse = null;

        if (webhookUrl) {
            try {
                const n8nRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers: enTetesWebhookN8N(),
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        questions: questions || "",
                    }),
                });
                n8nResponse = await n8nRes.json().catch(() => ({ status: "triggered" }));
            } catch (webhookError) {
                console.error("Erreur webhook N8N backlog:", webhookError);
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