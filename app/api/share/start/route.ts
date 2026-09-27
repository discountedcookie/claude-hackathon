import { randomBytes } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const HOUR = 3600_000;

// Starts (or resumes) a time-boxed safety share for the caller's own location during an accepted buddy event.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ request_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  // RLS: only participants can see the request.
  const { data: req } = await supabase
    .from("buddy_requests")
    .select("id, status, events(starts_at, ends_at)")
    .eq("id", body.data.request_id)
    .maybeSingle();
  const ev = req?.events as unknown as { starts_at: string | null; ends_at: string | null } | null;
  if (!req || req.status !== "accepted" || !ev?.starts_at) return Response.json({ error: "not found" }, { status: 404 });

  const start = new Date(ev.starts_at).getTime();
  const end = ev.ends_at ? new Date(ev.ends_at).getTime() : start + 4 * HOUR;
  const opensAt = start - 2 * HOUR;
  const closesAt = end + HOUR;
  if (Date.now() < opensAt || Date.now() > closesAt) return Response.json({ error: "outside_window" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("share_sessions")
    .select("id, token, closes_at")
    .eq("buddy_request_id", req.id)
    .eq("user_id", userId)
    .is("ended_at", null)
    .gt("closes_at", new Date().toISOString())
    .maybeSingle();
  if (existing) return Response.json(existing);

  const { data: session, error } = await admin
    .from("share_sessions")
    .insert({
      buddy_request_id: req.id,
      user_id: userId,
      token: randomBytes(18).toString("base64url"),
      opens_at: new Date(opensAt).toISOString(),
      closes_at: new Date(closesAt).toISOString(),
    })
    .select("id, token, closes_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(session);
}
