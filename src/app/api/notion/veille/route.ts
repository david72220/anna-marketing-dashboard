import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_VEILLE_DB_ID!;

export async function GET() {
    try {
        const results = await queryDatabase(DB_ID);

        const veille = results.map((page: Record<string, unknown>) => {
            const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
            return {
                id: page.id,
                title: getPageTitle(page),
                concurrent: getPropertyText(props["Concurrent"] || {}),
                plateforme: getPropertyText(props["Plateforme"] || {}),
                typeContenu: getPropertyText(props["Type Contenu"] || {}),
                performance: getPropertyText(props["Performance"] || {}),
                lecons: getPropertyText(props["Leçons"] || {}),
                statut: getPropertyText(props["Statut"] || {}),
                date: getPropertyText(props["Date"] || {}),
                createdTime: page.created_time,
            };
        });

        return NextResponse.json(veille);
    } catch (error) {
        console.error("Erreur Notion veille:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération de la veille" }, { status: 500 });
    }
}