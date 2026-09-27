import "server-only";
import { z } from "zod";
import { askJson, data, list, str } from "@/lib/claude";
import { fetchLumaEvent, LumaEvent } from "@/lib/luma";
import { createAdminClient } from "@/lib/supabase/admin";

const Facts = list(str(24), 4);

const EventSummary = z.object({
  en: str(400),
  th: str(400),
  zh: str(400),
  language: str(8).describe("ISO 639-1 code of the language the event is run in"),
  facts_en: Facts,
  facts_th: Facts,
  facts_zh: Facts,
});

const SUMMARY_SYSTEM = `You write event summaries for people near the event: locals, Chinese speakers and English speakers.
For each language: two or three sentences, at most 55 words. Sentence 1: what people actually do there. Sentence 2: who it suits or what to bring.
Do not mention the date, time, venue, price, or that it's free; those are shown elsewhere. No "join us", "don't miss", "whether you're…", no exclamation marks.
If the description already has text in a language (many are bilingual), write that language's summary from the author's own sentences, shortened, not paraphrased. Only languages the author didn't write are rewritten by you, as natural native text, not literal translations.
facts_*: at most 4 short chips (at most 3 words each) of practical things stated explicitly in the description, e.g. bring laptop, RSVP required, food provided, outdoors, beginners welcome, limited seats, workshop, talk. Never include the language, the price or "free", the date or the venue. If the description states none, return an empty list.
language: the language the event itself is run in.`;

// Upserts free, public events (server-only table) and returns their ids and whether they still need summaries.
export async function saveEvents(events: LumaEvent[]) {
  const rows = events
    .filter((e) => e.is_free && e.is_public)
    .map((e) => ({
      luma_url: e.luma_url,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      timezone: e.timezone,
      location: e.location,
      lat: e.lat,
      lng: e.lng,
      image_url: e.image_url,
      is_free: e.is_free,
      ...(e.description ? { description_raw: e.description } : {}),
    }));
  if (!rows.length) return [];
  const { data: saved, error } = await createAdminClient()
    .from("events")
    .upsert(rows, { onConflict: "luma_url" })
    .select("id, luma_url, title, location, starts_at, description_raw, summary_en");
  if (error) throw new Error(error.message);
  return saved ?? [];
}

type SavedEvent = Awaited<ReturnType<typeof saveEvents>>[number];

// Fills in the description (if missing) and the three summaries. Safe to call repeatedly.
export async function summarizeEvent(ev: SavedEvent) {
  if (ev.summary_en) return;
  const admin = createAdminClient();
  let description = ev.description_raw;
  if (!description) {
    description = (await fetchLumaEvent(ev.luma_url)).description;
    await admin.from("events").update({ description_raw: description }).eq("id", ev.id);
  }
  const s = await askJson({
    system: SUMMARY_SYSTEM,
    prompt: data("event", { title: ev.title, where: ev.location, when: ev.starts_at, description: description?.slice(0, 6000) }),
    schema: EventSummary,
  });
  await admin
    .from("events")
    .update({
      summary_en: s.en,
      summary_th: s.th,
      summary_zh: s.zh,
      language: s.language,
      facts: { en: s.facts_en, th: s.facts_th, zh: s.facts_zh },
    })
    .eq("id", ev.id);
}
