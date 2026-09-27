import { z } from "zod";
import { AiBusy } from "@/lib/claude";
import { generateIntro, introIsCurrent } from "@/lib/buddies";
import { takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

// Fills in an intro card that is missing (AI failed at accept time) or predates the three-language format.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ request_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  // RLS: only the two participants can read the request.
  const { data: req } = await supabase
    .from("buddy_requests")
    .select("id, status, icebreakers")
    .eq("id", body.data.request_id)
    .maybeSingle();
  if (!req || req.status !== "accepted") return Response.json({ error: "not found" }, { status: 404 });
  if (introIsCurrent(req.icebreakers, userId)) return Response.json({ ok: true });

  if (!(await takeQuota(`intro:${req.id}`, "1 day", 3))) return Response.json({ error: "rate_limited" }, { status: 429 });
  try {
    await generateIntro(req.id);
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }
  return Response.json({ ok: true });
}
