import { NextResponse } from "next/server";
import { queryDatabaseAll, getPageTitle, getPropertyText } from "@/lib/notion";

const POSTS_DB = process.env.NOTION_CONCURRENTS_POSTS_DB_ID!;
const COMPTES_DB = process.env.NOTION_CONCURRENTS_COMPTES_DB_ID!;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_CONCURRENTS;

interface PostConcurrent {
    id: string;
    accroche: string;
    plateforme: string;
    type: string;
    url: string;
    datePublication: string;
    vues: number;
    likes: number;
    commentaires: number;
    metriqueScore: string;
    score: number | null;
    analyseIA: string;
    angle: string;
    transposable: string;
    recycle: boolean;
    createdTime: string;
}

interface CompteConcurrent {
    id: string;
    nom: string;
    plateforme: string;
    handle: string;
    actif: boolean;
    moyenneVues: number;
    moyenneLikes: number;
    nbBaseline: number;
    derniereCollecte: string;
}

// getPropertyText renvoie une chaîne : inutilisable pour distinguer
// un nombre absent (score non calculable) d'un zéro réel.
function nombre(prop: Record<string, unknown> | undefined): number | null {
    if (!prop) return null;
    const v = prop.number;
    return typeof v === "number" ? v : null;
}

function booleen(prop: Record<string, unknown> | undefined): boolean {
    return prop?.checkbox === true;
}

async function fetchPosts(): Promise<PostConcurrent[]> {
    const results = await queryDatabaseAll(POSTS_DB, {
        sorts: [{ property: "Score surperformance", direction: "descending" }],
    });
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id as string,
            accroche: getPageTitle(page),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            type: getPropertyText(props["Type"] || {}),
            url: getPropertyText(props["URL post"] || {}),
            datePublication: getPropertyText(props["Date publication"] || {}),
            vues: nombre(props["Vues"]) ?? 0,
            likes: nombre(props["Likes"]) ?? 0,
            commentaires: nombre(props["Commentaires"]) ?? 0,
            metriqueScore: getPropertyText(props["Métrique de score"] || {}),
            score: nombre(props["Score surperformance"]),
            analyseIA: getPropertyText(props["Analyse IA"] || {}),
            angle: getPropertyText(props["Angle"] || {}),
            transposable: getPropertyText(props["Transposable Anna"] || {}),
            recycle: booleen(props["Recyclé"]),
            createdTime: page.created_time as string,
        };
    });
}

async function fetchComptes(): Promise<CompteConcurrent[]> {
    const results = await queryDatabaseAll(COMPTES_DB);
    return results.map((page: Record<string, unknown>) => {
        const props = (page.properties || {}) as Record<string, Record<string, unknown>>;
        return {
            id: page.id as string,
            nom: getPageTitle(page),
            plateforme: getPropertyText(props["Plateforme"] || {}),
            handle: getPropertyText(props["Handle"] || {}),
            actif: booleen(props["Actif"]),
            moyenneVues: nombre(props["Moyenne vues"]) ?? 0,
            moyenneLikes: nombre(props["Moyenne likes"]) ?? 0,
            nbBaseline: nombre(props["Nb posts baseline"]) ?? 0,
            derniereCollecte: getPropertyText(props["Dernière collecte"] || {}),
        };
    });
}

export async function GET() {
    try {
        const [posts, comptes] = await Promise.all([fetchPosts(), fetchComptes()]);
        return NextResponse.json({ posts, comptes });
    } catch (error) {
        console.error("Erreur lecture concurrents:", error);
        return NextResponse.json({ error: "Erreur lors de la lecture" }, { status: 500 });
    }
}

export async function POST() {
    if (!N8N_WEBHOOK) {
        return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
    }
    try {
        const res = await fetch(N8N_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "dashboard" }),
        });
        return NextResponse.json({ success: res.ok, status: res.status });
    } catch (error) {
        console.error("Erreur déclenchement Module D:", error);
        return NextResponse.json({ error: "Erreur lors du déclenchement" }, { status: 500 });
    }
}
