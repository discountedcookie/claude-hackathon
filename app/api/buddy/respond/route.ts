import { z } from "zod";
import { generateIntro } from "@/lib/buddies";
import { createClient, getUserId } from "@/lib/supabase/server";

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

  try {
    await generateIntro(body.data.request_id);
  } catch {
    // The match stands; the card asks for the intro again (/api/buddy/intro) and shows a plain fallback meanwhile.
  }
  return Response.json({ ok: true });
}
