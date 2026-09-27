import { after } from "next/server";
import { z } from "zod";
import { fetchLumaEvent, normalizeLumaUrl } from "@/lib/luma";
import { saveEvents, summarizeEvent } from "@/lib/summaries";
import { takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

export const maxDuration = 120;

// A pasted Luma link: save the event (if free and public) and mark the caller as going.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z
    .object({ url: z.string().max(300), note: z.string().trim().max(200).optional() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  let url: string;
  try {
    url = normalizeLumaUrl(body.data.url);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!(await takeQuota(`paste:${userId}`, "1 hour", 10)))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  let ev;
  try {
    ev = await fetchLumaEvent(url);
  } catch {
    return Response.json({ error: "private_or_unreadable" }, { status: 422 });
  }
  if (!ev.is_public) return Response.json({ error: "private_or_unreadable" }, { status: 422 });
  if (!ev.is_free) return Response.json({ error: "free_only" }, { status: 422 });

  const [saved] = await saveEvents([ev]);
  if (!saved.summary_en) after(() => summarizeEvent(saved));

  const { error } = await supabase
    .from("attendances")
    .upsert(
      { event_id: saved.id, user_id: userId, note: body.data.note || null },
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ event: { id: saved.id, title: saved.title } });
}
