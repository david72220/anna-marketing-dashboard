const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_BASE = "https://api.notion.com/v1";

const headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
};

export async function getPage(pageId: string) {
    const res = await fetch(`${NOTION_BASE}/pages/${pageId}`, { headers });
    if (!res.ok) return null;
    return res.json();
}

export async function createPage(databaseId: string, properties: Record<string, unknown>) {
    const res = await fetch(`${NOTION_BASE}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });
    if (!res.ok) throw new Error(`Notion create error: ${res.status} ${await res.text()}`);
    return res.json();
}

export async function updatePageProperties(pageId: string, properties: Record<string, unknown>) {
    const res = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ properties }),
    });
    if (!res.ok) throw new Error(`Notion update error: ${res.status} ${await res.text()}`);
    return res.json();
}
