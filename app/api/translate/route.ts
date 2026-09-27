import { createHash } from "crypto";
import { z } from "zod";
import { AiBusy, askJson, data, LANG_NAMES, list, str } from "@/lib/claude";
import { scriptLang } from "@/lib/script";
import { createAdminClient, takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

// What people write to each other, by where it lives. Loaded with the caller's own client, so RLS
// guarantees only text they can already see gets translated (no free translation endpoint).
const SOURCES = {
  note: { table: "attendances", column: "note" },
  hello: { table: "buddy_requests", column: "note" },
  bio: { table: "profiles", column: "bio" },
  mission: { table: "project_requests", column: "mission" },
} as const;
type Kind = keyof typeof SOURCES;

const Body = z.object({
  lang: z.enum(["en", "th", "zh"]),
  items: z.array(z.object({ kind: z.enum(["note", "hello", "bio", "mission"]), id: z.uuid() })).min(1).max(30),
});

const Result = z.object({ items: list(z.object({ i: z.number(), text: str(400) }), 30) });

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { lang, items } = body.data;

  // Load the source texts the caller is allowed to read.
  const texts: Record<string, string> = {};
  for (const kind of Object.keys(SOURCES) as Kind[]) {
    const ids = items.filter((it) => it.kind === kind).map((it) => it.id);
    if (!ids.length) continue;
    const { table, column } = SOURCES[kind];
    const { data: rows } = await supabase.from(table).select(`id, ${column}`).in("id", ids);
    for (const row of (rows ?? []) as unknown as Record<string, string | null>[]) {
      const text = row[column]?.trim();
      if (text && scriptLang(text) !== lang) texts[`${kind}:${row.id}`] = text;
    }
  }
  const keys = Object.keys(texts);
  if (!keys.length) return Response.json({ translations: {} });

  const admin = createAdminClient();
  const hashes = [...new Set(keys.map((k) => hash(texts[k])))];
  const { data: cached } = await admin.from("translations").select("hash, text").eq("lang", lang).in("hash", hashes);
  const byHash: Record<string, string> = Object.fromEntries((cached ?? []).map((r) => [r.hash, r.text]));

  const missing = [...new Set(keys.map((k) => texts[k]).filter((t) => !byHash[hash(t)]))];
  if (missing.length && (await takeQuota(`translate:${userId}`, "1 hour", 200, missing.length))) {
    try {
      const result = await askJson({
        system: `Translate each numbered item into ${LANG_NAMES[lang]}. Keep the meaning, tone and names; add nothing, explain nothing. Short texts stay short.`,
        prompt: missing.map((t, i) => data("message", `${i}: ${t}`)).join("\n"),
        schema: Result,
        effort: "low",
        maxTokens: 4000,
      });
      const rows = result.items
        .filter((r) => missing[r.i] !== undefined && r.text.trim())
        .map((r) => ({ hash: hash(missing[r.i]), lang, text: r.text.trim() }));
      if (rows.length) await admin.from("translations").upsert(rows);
      for (const r of rows) byHash[r.hash] = r.text;
    } catch (e) {
      if (!(e instanceof AiBusy)) throw e;
    }
  }

  const translations = Object.fromEntries(keys.filter((k) => byHash[hash(texts[k])]).map((k) => [k, byHash[hash(texts[k])]]));
  return Response.json({ translations });
}
