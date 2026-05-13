import { NextResponse } from "next/server";
import { queryDatabase, getPageTitle, getPropertyText } from "@/lib/notion";

const DB_ID = process.env.NOTION_BACKLOG_DB_ID!;

export async function GET() {
    try {
        const results = await queryDatabase(DB_ID);

        const backlog = results.map((page: Record<string, unknown>) => {
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
            };
        });

        return NextResponse.json(backlog);
    } catch (error) {
        console.error("Erreur Notion backlog:", error);
        return NextResponse.json({ error: "Erreur lors de la récupération du backlog" }, { status: 500 });
    }
}