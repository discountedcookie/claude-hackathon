import { z } from "zod";
import { AiBusy, askJson, data, LANG_NAMES, str } from "@/lib/claude";
import { loadBuddyContext, strongestLanguage } from "@/lib/buddies";
import { takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const FollowUp = z.object({
  message_in_their_language: str(220),
  message_in_my_language: str(220).describe("Empty string when both languages are the same"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ request_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  const ctx = await loadBuddyContext(body.data.request_id);
  const isParticipant = ctx && (ctx.req.from_id === userId || ctx.req.to_id === userId);
  if (!ctx || !isParticipant || ctx.req.status !== "accepted")
    return Response.json({ error: "not found" }, { status: 404 });
  if (!ctx.event.starts_at || new Date(ctx.event.starts_at) > new Date())
    return Response.json({ error: "after the event" }, { status: 400 });

  if (!(await takeQuota(`followup:${ctx.req.id}:${userId}`, "36500 days", 3)))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  const [me, them] = ctx.from.id === userId ? [ctx.from, ctx.to] : [ctx.to, ctx.from];
  const theirLang = strongestLanguage(them);
  const myLang = LANG_NAMES[me.language as keyof typeof LANG_NAMES] ?? LANG_NAMES.en;
  const sameLanguage = theirLang === me.language;

  try {
    const draft = await askJson({
      system: `Draft a message one person sends their event buddy after the event. At most 2 sentences: one concrete thing from the event or the buddy's profile, then one concrete next step (a place or a kind of event).
Forbidden: "so much", "really enjoyed", "stay in touch", "let me know", more than one exclamation mark, opening with "Hi {name}!". Plain and warm, like a text from a friend.
Write message_in_their_language in the language with ISO code "${theirLang}". ${
        sameLanguage ? "Leave message_in_my_language empty." : `Write message_in_my_language as the same message in ${myLang}.`
      }`,
      prompt: [data("event", ctx.event), data("person", { role: "me", ...me, id: undefined }), data("person", { role: "buddy", ...them, id: undefined })].join("\n"),
      schema: FollowUp,
    });
    return Response.json(sameLanguage ? { ...draft, message_in_my_language: "" } : draft);
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }
}
