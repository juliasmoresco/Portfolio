import type { Block, PageInfo } from "./types.ts";

const BASE = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A small Notion client: just the four calls the sync needs, with paging and polite retries. */
export function createNotionClient(token: string) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(BASE + path, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
      if (res.ok) return (await res.json()) as T;
      // Rate limited: wait as long as Notion says, then try again. Server hiccups get a couple of retries.
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = Number(res.headers.get("retry-after")) || 1 + attempt;
        await sleep(wait * 1000);
        continue;
      }
      let detail = "";
      try {
        detail = ((await res.json()) as { message?: string }).message ?? "";
      } catch {
        /* no body */
      }
      if (res.status === 401) throw new Error("Notion rejected the key (401). Check NOTION_TOKEN in .env.");
      if (res.status === 404) {
        throw new Error(`Notion says ${path} was not found (404). Share that page with your integration: open it in Notion → ••• → Connections → add the integration.`);
      }
      throw new Error(`Notion ${res.status} for ${path}: ${detail}`);
    }
  }

  /** Every child block of `id`, in order, with their own children filled in (columns, lists, synced blocks, ...). */
  async function blocks(id: string): Promise<Block[]> {
    const out: Block[] = [];
    let cursor: string | undefined;
    do {
      const q = new URLSearchParams({ page_size: "100" });
      if (cursor) q.set("start_cursor", cursor);
      const page = await request<{ results: Block[]; has_more: boolean; next_cursor: string | null }>(`/blocks/${id}/children?${q}`);
      out.push(...page.results);
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    } while (cursor);

    for (const b of out) {
      if (b.type === "child_database" || b.type === "child_page") continue;
      // A synced copy has no children of its own: read the original's.
      const synced = b.type === "synced_block" ? (b.synced_block as { synced_from: { block_id: string } | null }).synced_from : null;
      if (synced) b.children = await blocks(synced.block_id);
      else if (b.has_children) b.children = await blocks(b.id);
    }
    return out;
  }

  async function page(id: string): Promise<PageInfo> {
    return request<PageInfo>(`/pages/${id}`);
  }

  async function queryDatabase(id: string): Promise<PageInfo[]> {
    const out: PageInfo[] = [];
    let cursor: string | undefined;
    do {
      const res = await request<{ results: PageInfo[]; has_more: boolean; next_cursor: string | null }>(`/databases/${id}/query`, {
        method: "POST",
        body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
      });
      out.push(...res.results);
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return out;
  }

  return { blocks, page, queryDatabase };
}

export type NotionClient = ReturnType<typeof createNotionClient>;
