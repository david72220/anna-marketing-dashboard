export function formatDate(dateStr: string): string {
    // Extract date portion from ISO strings (e.g. "2026-05-18T00:00:00.000+02:00" → "2026-05-18")
    const dateOnly = dateStr.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_BASE = "https://api.notion.com/v1";

export async function queryDatabase(databaseId: string, filter?: Record<string, unknown>) {
    const res = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            ...(filter ? { filter } : {}),
            sorts: [{ timestamp: "created_time", direction: "descending" }],
            page_size: 50,
        }),
    });

    if (!res.ok) {
        throw new Error(`Notion API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.results;
}

export function getPageTitle(page: Record<string, unknown>): string {
    const properties = page.properties as Record<string, Record<string, unknown>>;
    for (const prop of Object.values(properties)) {
        if (prop.type === "title") {
            const titleArr = prop.title as Array<{ plain_text: string }>;
            return titleArr.map((t) => t.plain_text).join("");
        }
    }
    return "Sans titre";
}

export function getPropertyText(prop: Record<string, unknown>): string {
    if (!prop) return "";
    const type = prop.type as string;
    switch (type) {
        case "rich_text": {
            const arr = prop.rich_text as Array<{ plain_text: string }>;
            return arr.map((t) => t.plain_text).join("");
        }
        case "select": {
            const sel = prop.select as { name: string } | null;
            return sel?.name || "";
        }
        case "multi_select": {
            const arr = prop.multi_select as Array<{ name: string }>;
            return arr.map((s) => s.name).join(", ");
        }
        case "status": {
            const st = prop.status as { name: string } | null;
            return st?.name || "";
        }
        case "date": {
            const d = prop.date as { start: string } | null;
            if (!d?.start) return "";
            return formatDate(d.start);
        }
        case "url":
            return (prop.url as string) || "";
        case "number":
            return prop.number !== null ? String(prop.number) : "";
        default:
            return "";
    }
}