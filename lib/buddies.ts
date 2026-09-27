import "server-only";
import { z } from "zod";
import { askJson, data, list, str } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";

const LEVEL_RANK = { basic: 1, conversational: 2, fluent: 3, native: 4 } as const;

export type PersonForAI = {
  id: string;
  display_name: string;
  language: string;
  bio: string | null;
  interests: string[];
  offers: string | null;
  wants: string | null;
  languages: { code: string; level: keyof typeof LEVEL_RANK }[];
};

// Loads an accepted-or-pending buddy request with both people and the event, for AI prompts.
export async function loadBuddyContext(requestId: string) {
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("buddy_requests")
    .select("id, event_id, from_id, to_id, note, status, events(title, starts_at, ends_at, location, language)")
    .eq("id", requestId)
    .single();
  if (!req) return null;
  const { data: people } = await admin
    .from("profiles")
    .select("id, display_name, language, bio, interests, offers, wants, languages")
    .in("id", [req.from_id, req.to_id]);
  const byId = Object.fromEntries((people as PersonForAI[]).map((p) => [p.id, p]));
  const { data: notes } = await admin
    .from("attendances")
    .select("user_id, note")
    .eq("event_id", req.event_id)
    .in("user_id", [req.from_id, req.to_id]);
  const noteBy = Object.fromEntries((notes ?? []).map((n) => [n.user_id, n.note]));
  return {
    req,
    event: req.events as unknown as { title: string; starts_at: string | null; ends_at: string | null; location: string | null; language: string | null },
    from: { ...byId[req.from_id], event_note: noteBy[req.from_id] ?? null },
    to: { ...byId[req.to_id], event_note: noteBy[req.to_id] ?? null },
  };
}

export function strongestLanguage(p: PersonForAI): string {
  const best = [...(p.languages ?? [])].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];
  return best?.code ?? p.language;
}

const Card = z.object({
  meet: str(90).describe("One concrete meeting point at or near the venue and how many minutes before the start, e.g. 'By the front desk, 10 min before'"),
  openers: list(str(80), 2).describe(
    "Up to two questions, each naming one specific thing from the OTHER person's interests, offers, wants or event note. Empty if nothing specific.",
  ),
});
// Each person's card in all three UI languages, so it follows their language switch.
const Cards = z.object({ en: Card, th: Card, zh: Card });
const Intro = z.object({ for_sender: Cards, for_recipient: Cards });

// Writes the intro card for an accepted request. Throws AiBusy when Claude isn't available.
export async function generateIntro(requestId: string) {
  const ctx = await loadBuddyContext(requestId);
  if (!ctx) return;
  const intro = await askJson({
    system: `Two people agreed to go to an event together. For each of them write where to meet and up to two openers about the other person.
Openers must name something specific from the other person's profile or note. Never ask "what brought you here" or anything you could ask a stranger; if you can't be specific, return fewer openers. No advice, no cultural notes, no exclamation marks.
Write each card in English (en), Thai (th) and Simplified Chinese (zh): the same content, natural in each language.`,
    prompt: [
      data("event", ctx.event),
      data("person", { role: "sender", ...ctx.from, id: undefined }),
      data("person", { role: "recipient", ...ctx.to, id: undefined }),
      data("note", { request_note: ctx.req.note }),
    ].join("\n"),
    schema: Intro,
  });
  await createAdminClient()
    .from("buddy_requests")
    .update({ icebreakers: { [ctx.from.id]: intro.for_sender, [ctx.to.id]: intro.for_recipient } })
    .eq("id", ctx.req.id);
}

// True when the stored intro already has all three languages for this person.
export function introIsCurrent(icebreakers: unknown, userId: string) {
  const mine = (icebreakers as Record<string, Record<string, unknown>> | null)?.[userId];
  return !!mine && ["en", "th", "zh"].every((l) => mine[l]);
}
