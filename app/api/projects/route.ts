import { createClient } from "@/lib/supabase/server";
import { generateSummaries } from "@/lib/summaries";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = await request.json();
  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) return Response.json({ error: "title required" }, { status: 400 });

  let description_th = null;
  let description_zh = null;
  try {
    const s = await generateSummaries({
      kind: "project",
      title,
      description: body.description ? String(body.description).slice(0, 2000) : null,
      extra: body.looking_for ? `looking for: ${String(body.looking_for).slice(0, 500)}` : null,
    });
    if (s) {
      description_th = s.th;
      description_zh = s.zh;
    }
  } catch {
    // non-fatal
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      description: body.description ? String(body.description).slice(0, 2000) : null,
      looking_for: body.looking_for ? String(body.looking_for).slice(0, 500) : null,
      category: body.category ?? "build",
      description_th,
      description_zh,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ project });
}
