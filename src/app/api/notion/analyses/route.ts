import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_ANALYSES_DB_ID!;

export async function GET() {
    try {
        const results = await queryDatabase(DB_ID);

        const analyses = results.map((page: Record<string, unknown>) => {
            const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
            return {
                id: page.id,
                title: getPageTitle(page),
                plateforme: getPropertyText(props["Plateforme"] || {}),
                scorePertinence: getPropertyText(props["Score Pertinence"] || {}),
                scoreEngagement: getPropertyText(props["Score Engagement"] || {}),
                recommandations: getPropertyText(props["Recommandations"] || {}),
                statut: getPropertyText(props["Statut"] || {}),
                dateAnalyse: getPropertyText(props["Date Analyse"] || {}),
                urlContenu: getPropertyText(props["URL Contenu"] || {}),
                createdTime: page.created_time,
            };
        });

        return NextResponse.json(analyses);
    } catch (error) {
        console.error("Erreur Notion analyses:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération des analyses" }, { status: 500 });
    }
}