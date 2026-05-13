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
            return d?.start ? new Date(d.start).toLocaleDateString("fr-FR") : "";
        }
        case "url":
            return (prop.url as string) || "";
        case "number":
            return prop.number !== null ? String(prop.number) : "";
        default:
            return "";
    }
}