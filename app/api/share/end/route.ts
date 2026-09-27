import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

// "I'm safe": ends the caller's own share session.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ session_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  await createAdminClient()
    .from("share_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", body.data.session_id)
    .eq("user_id", userId)
    .is("ended_at", null);
  return Response.json({ ok: true });
}
