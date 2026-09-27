import { z } from "zod";
import { askJson, data, LANG_NAMES, list, str } from "@/lib/claude";
import { loadBuddyContext } from "@/lib/buddies";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const Card = z.object({
  meet: str(90).describe("One concrete meeting point at or near the venue and how many minutes before the start, e.g. 'By the front desk, 10 min before'"),
  openers: list(str(80), 2).describe(
    "Up to two questions, each naming one specific thing from the OTHER person's interests, offers, wants or event note. Empty if nothing specific.",
  ),
});
const Intro = z.object({ for_sender: Card, for_recipient: Card });

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ request_id: z.uuid(), accept: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  // RLS + column grant: only the recipient can move a pending request to accepted/declined.
  const { data: updated } = await supabase
    .from("buddy_requests")
    .update({ status: body.data.accept ? "accepted" : "declined" })
    .eq("id", body.data.request_id)
    .eq("to_id", userId)
    .eq("status", "pending")
    .select("id");
  if (!updated?.length) return Response.json({ error: "not found" }, { status: 404 });
  if (!body.data.accept) return Response.json({ ok: true });

  const ctx = await loadBuddyContext(body.data.request_id);
  if (!ctx) return Response.json({ ok: true });
  const langName = (l: string) => LANG_NAMES[l as keyof typeof LANG_NAMES] ?? LANG_NAMES.en;

  try {
    const intro = await askJson({
      system: `Two people just agreed to go to an event together. For each of them write where to meet and up to two openers about the other person.
Openers must name something specific from the other person's profile or note. Never ask "what brought you here" or anything you could ask a stranger; if you can't be specific, return fewer openers. No advice, no cultural notes, no exclamation marks.
Write for_sender entirely in ${langName(ctx.from.language)} and for_recipient entirely in ${langName(ctx.to.language)}.`,
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
  } catch {
    // The match stands without an intro card; the UI shows a generic fallback.
  }
  return Response.json({ ok: true });
}
