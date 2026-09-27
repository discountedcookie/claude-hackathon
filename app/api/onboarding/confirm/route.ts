import { z } from "zod";
import type { LanguageSkill } from "@/lib/claude";
import { check, LINE_ID } from "@/lib/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

// Saves the confirmed profile. Edits may only rename and remove items from the parsed draft, never add new text.
const Body = z.object({
  display_name: z.string().trim().min(1).max(60).refine((v) => !check("name", v), "invalid name"),
  languages: z.array(z.string().max(8)).min(1).max(6),
  interests: z.array(z.string().max(30)).max(6),
  line_id: z.string().trim().regex(LINE_ID, "invalid LINE ID"),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  // Guests (anonymous sign-in) may finish with just a LINE ID; they can add email + password later from the account menu.
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad request" }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("onboarding_sessions").select("draft").eq("user_id", userId).maybeSingle();
  const draft = session?.draft as
    | { bio: string; interests: string[]; offers: string; wants: string; languages: LanguageSkill[] }
    | null;
  if (!draft) return Response.json({ error: "no draft" }, { status: 409 });

  const languages = draft.languages.filter((l) => body.data.languages.includes(l.code));
  if (!languages.length) return Response.json({ error: "languages required" }, { status: 400 });

  await admin.from("contacts").upsert({ user_id: userId, line_id: body.data.line_id });
  await admin
    .from("profiles")
    .update({
      display_name: body.data.display_name,
      bio: draft.bio || null,
      interests: draft.interests.filter((i) => body.data.interests.includes(i)),
      offers: draft.offers || null,
      wants: draft.wants || null,
      languages,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", userId);
  await admin.from("onboarding_sessions").update({ done_at: new Date().toISOString() }).eq("user_id", userId);
  return Response.json({ ok: true });
}
