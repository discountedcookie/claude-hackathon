import { createClient } from "@/lib/supabase/server";
import { normalizeLumaUrl, fetchLumaEvent } from "@/lib/luma";
import { generateSummaries } from "@/lib/summaries";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "sign in first" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "foreigner")
    return Response.json({ error: "foreigners only" }, { status: 403 });

  let url: string;
  let mission: string | null = null;
  try {
    const body = await request.json();
    url = normalizeLumaUrl(String(body.url ?? ""));
    mission = body.mission ? String(body.mission).slice(0, 500) : null;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await fetchLumaEvent(url);
  } catch (e) {
    return Response.json(
      { error: `could not read Luma page (private event?): ${(e as Error).message}` },
      { status: 422 },
    );
  }

  const { data: event, error: upsertError } = await supabase
    .from("events")
    .upsert(
      {
        luma_url: parsed.luma_url,
        title: parsed.title,
        description_en: parsed.description,
        starts_at: parsed.starts_at,
        location: parsed.location,
        image_url: parsed.image_url,
      },
      { onConflict: "luma_url" },
    )
    .select()
    .single();
  if (upsertError || !event)
    return Response.json({ error: upsertError?.message ?? "event upsert failed" }, { status: 500 });

  if (!event.description_th) {
    try {
      const s = await generateSummaries({
        kind: "event",
        title: event.title,
        description: event.description_en,
        extra: `${event.location ?? ""} ${event.starts_at ?? ""}`,
      });
      if (s) {
        event.description_th = s.th;
        event.description_zh = s.zh;
        await supabase
          .from("events")
          .update({ description_th: s.th, description_zh: s.zh })
          .eq("id", event.id);
      }
    } catch {
      // non-fatal: summaries can be backfilled later
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .upsert(
      { event_id: event.id, foreigner_id: user.id, mission },
      { onConflict: "event_id,foreigner_id" },
    )
    .select()
    .single();
  if (offerError)
    return Response.json({ error: offerError.message }, { status: 500 });

  return Response.json({ event, offer });
}
