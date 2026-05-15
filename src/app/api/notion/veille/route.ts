import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_VEILLE_DB_ID!;

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
        const { prompt } = await request.json();
        const veille = await fetchVeille();

        if (!prompt || !prompt.trim()) {
            // Recherche automatique par mots-clés : retourner tout
            return NextResponse.json(veille);
        }

        // Filtre basique par mots du prompt (approche simple en attendant l'IA)
        const terms = prompt.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
        const filtered = veille.filter((v: VeilleItem) => {
            const text = `${v.title} ${v.concurrent} ${v.plateforme} ${v.typeContenu} ${v.performance} ${v.lecons}`.toLowerCase();
            return terms.some((term: string) => text.includes(term));
        });

        return NextResponse.json(filtered.length > 0 ? filtered : veille);
    } catch (error) {
        console.error("Erreur POST veille:", error);
        return NextResponse.json({ error: "Erreur lors de la recherche de veille" }, { status: 500 });
    }
}
