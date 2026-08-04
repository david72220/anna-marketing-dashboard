import { NextResponse } from "next/server";
import { getPage, createPage, updatePageProperties } from "@/lib/notion-write";

const POSTS_DB = process.env.NOTION_CONCURRENTS_POSTS_DB_ID!;
const BACKLOG_DB = process.env.NOTION_BACKLOG_DB_ID!;

const FORMAT_PAR_TYPE: Record<string, string> = {
    Reel: "Reel",
    Carrousel: "Carrousel",
    TikTok: "Vidéo courte",
    Photo: "Post texte",
};

// getPage() n'est pas typé (retourne le JSON brut de l'API Notion) : on
// déclare ici la forme minimale dont cette route a besoin, plutôt que `any`.
interface NotionRichText {
    plain_text: string;
}

interface NotionSelect {
    name: string;
}

interface NotionPropertyValue {
    title?: NotionRichText[];
    rich_text?: NotionRichText[];
    url?: string | null;
    number?: number | null;
    select?: NotionSelect | null;
    checkbox?: boolean;
}

interface NotionPage {
    id: string;
    parent?: { type?: string; database_id?: string };
    properties?: Record<string, NotionPropertyValue>;
}

function idNormalise(id: string): string {
    return id.replace(/-/g, "").toLowerCase();
}

function texteCourt(valeur: string, max = 1900): string {
    return String(valeur || "").slice(0, max);
}

export async function POST(request: Request) {
    // L'authentification est assurée par le middleware sur /api/*.
    // Le contrôle d'appartenance ci-dessous reste indispensable : sans lui,
    // un identifiant de page arbitraire permettrait d'écrire n'importe où.
    try {
        const { postId } = await request.json();

        if (typeof postId !== "string" || !/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(postId)) {
            return NextResponse.json({ error: "postId invalide" }, { status: 400 });
        }

        const page = (await getPage(postId)) as NotionPage | null;
        if (!page) {
            return NextResponse.json({ error: "Post introuvable" }, { status: 404 });
        }

        const parentId = page.parent?.database_id || "";
        if (idNormalise(parentId) !== idNormalise(POSTS_DB)) {
            return NextResponse.json({ error: "Post hors périmètre" }, { status: 403 });
        }

        const props = page.properties || {};

        if (props["Recyclé"]?.checkbox === true) {
            return NextResponse.json({ success: true, deja: true });
        }

        const accroche = props["Accroche"]?.title?.[0]?.plain_text || "Post recyclé";
        const url = props["URL post"]?.url || "";
        const score = props["Score surperformance"]?.number ?? null;
        const analyse = props["Analyse IA"]?.rich_text?.map((t) => t.plain_text).join("") || "";
        const plateforme = props["Plateforme"]?.select?.name || "Instagram";
        const type = props["Type"]?.select?.name || "";

        const origine = score !== null
            ? `Inspiré d'une publication à ${score}× la moyenne de son compte.`
            : "Inspiré d'une publication concurrente.";

        const creee = await createPage(BACKLOG_DB, {
            Nom: { title: [{ text: { content: texteCourt(accroche, 100) } }] },
            Plateforme: { select: { name: plateforme } },
            ...(FORMAT_PAR_TYPE[type] ? { Format: { select: { name: FORMAT_PAR_TYPE[type] } } } : {}),
            Hook: { rich_text: [{ text: { content: texteCourt(accroche) } }] },
            "Message Cle": { rich_text: [{ text: { content: texteCourt(`${origine} ${analyse}`.trim()) } }] },
            Solution: { rich_text: [{ text: { content: texteCourt(`Source : ${url}`) } }] },
            Statut: { select: { name: "Idee" } },
            "Date Generation": { date: { start: new Date().toISOString().split("T")[0] } },
        });

        await updatePageProperties(postId, { "Recyclé": { checkbox: true } });

        return NextResponse.json({ success: true, backlogId: creee.id });
    } catch (error) {
        console.error("Erreur recyclage:", error);
        return NextResponse.json({ error: "Erreur lors du recyclage" }, { status: 500 });
    }
}
