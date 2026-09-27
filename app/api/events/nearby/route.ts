import { after } from "next/server";
import { z } from "zod";
import { fetchNearbyEvents } from "@/lib/luma";
import { saveEvents, summarizeEvent } from "@/lib/summaries";
import { createAdminClient, takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 300;

const MAX_SUMMARIES_PER_IMPORT = 20;

// Imports upcoming free Luma events around the viewer. The feed itself reads events from the DB.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const parsed = z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad coordinates" }, { status: 400 });
  const { lat, lng } = parsed.data;

  const admin = createAdminClient();
  const cell = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  const { data: recent } = await admin
    .from("luma_imports")
    .select("fetched_at")
    .eq("cell", cell)
    .gt("fetched_at", new Date(Date.now() - 3600_000).toISOString())
    .maybeSingle();
  if (recent) return Response.json({ imported: 0, cached: true });

  if (!(await takeQuota(`nearby:${userId}`, "1 hour", 3)))
    return Response.json({ imported: 0, limited: true });

  const events = await fetchNearbyEvents(lat, lng);
  const saved = await saveEvents(events);
  await admin.from("luma_imports").upsert({ cell, fetched_at: new Date().toISOString() });

  const pending = saved.filter((e) => !e.summary_en).slice(0, MAX_SUMMARIES_PER_IMPORT);
  after(() => Promise.allSettled(pending.map(summarizeEvent)));

  return Response.json({ imported: saved.length });
}
