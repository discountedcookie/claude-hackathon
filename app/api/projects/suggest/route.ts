import { z } from "zod";
import { AiBusy, askJson, data, list, str } from "@/lib/claude";
import { createAdminClient, takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const Suggestions = z.object({
  suggestions: list(
    z.object({
      user_id: str(40),
      reason_en: str(90).describe("One clause without their name, starting with the overlap, e.g. 'shoots street photos on weekends'"),
      reason_th: str(90),
      reason_zh: str(90),
    }),
    5,
  ),
});

// "People you've met who might fit": ranks your accepted buddies and teammates for one of your projects.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ project_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, looking_for, suggestions")
    .eq("id", body.data.project_id)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!project) return Response.json({ error: "not found" }, { status: 404 });
  if (project.suggestions) return Response.json({ suggestions: project.suggestions });

  const admin = createAdminClient();
  const [{ data: buddies }, { data: teamReqs }, { data: members }] = await Promise.all([
    admin.from("buddy_requests").select("from_id, to_id").eq("status", "accepted").or(`from_id.eq.${userId},to_id.eq.${userId}`),
    admin.from("project_requests").select("requester_id, projects!inner(owner_id)").eq("status", "accepted").eq("projects.owner_id", userId),
    admin.from("project_requests").select("requester_id").eq("project_id", project.id),
  ]);
  const already = new Set([userId, ...(members ?? []).map((m) => m.requester_id)]);
  const met = new Set<string>([
    ...(buddies ?? []).flatMap((b) => [b.from_id, b.to_id]),
    ...(teamReqs ?? []).map((r) => r.requester_id),
  ]);
  const candidateIds = [...met].filter((id) => !already.has(id)).slice(0, 20);
  if (!candidateIds.length) return Response.json({ suggestions: [] });

  if (!(await takeQuota(`suggest:${userId}`, "1 day", 10)))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  const { data: people } = await admin
    .from("profiles")
    .select("id, display_name, bio, interests, offers, languages")
    .in("id", candidateIds);

  let result;
  try {
    result = await askJson({
      system: `Suggest which people this project owner has already met might be a good fit for their project. Pick at most 5, best first, only from the listed people, and use their exact user_id. Write each reason as one short clause without the name, in English, Thai and Chinese.`,
      prompt: [data("project", project), ...(people ?? []).map((p) => data("person", { user_id: p.id, ...p, id: undefined }))].join("\n"),
      schema: Suggestions,
    });
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }

  const names = Object.fromEntries((people ?? []).map((p) => [p.id, p.display_name]));
  const suggestions = result.suggestions
    .filter((s) => names[s.user_id])
    .map((s) => ({ ...s, display_name: names[s.user_id] }));
  await admin.from("projects").update({ suggestions }).eq("id", project.id);
  return Response.json({ suggestions });
}
