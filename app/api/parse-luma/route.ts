import { createClient } from "@/lib/supabase/server";
import { normalizeLumaUrl, fetchLumaEvent } from "@/lib/luma";
import { generateThaiDescription } from "@/lib/thai";

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
  try {
    const body = await request.json();
    url = normalizeLumaUrl(String(body.url ?? ""));
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
      const description_th = await generateThaiDescription({
        title: event.title,
        description: event.description_en,
        starts_at: event.starts_at,
        location: event.location,
      });
      await supabase.from("events").update({ description_th }).eq("id", event.id);
      event.description_th = description_th;
    } catch {
      // non-fatal: Thai description can be backfilled later
    }
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .upsert(
      { event_id: event.id, foreigner_id: user.id },
      { onConflict: "event_id,foreigner_id" },
    )
    .select()
    .single();
  if (offerError)
    return Response.json({ error: offerError.message }, { status: 500 });

  return Response.json({ event, offer });
}
