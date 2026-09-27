import "server-only";
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
    .select("id, event_id, from_id, to_id, note, status, events(title, starts_at, location, language)")
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
    event: req.events as unknown as { title: string; starts_at: string | null; location: string | null; language: string | null },
    from: { ...byId[req.from_id], event_note: noteBy[req.from_id] ?? null },
    to: { ...byId[req.to_id], event_note: noteBy[req.to_id] ?? null },
  };
}

export function strongestLanguage(p: PersonForAI): string {
  const best = [...(p.languages ?? [])].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];
  return best?.code ?? p.language;
}
