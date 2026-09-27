import { z } from "zod";
import { AiBusy, askJson, data, str } from "@/lib/claude";
import { createAdminClient, takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const Listing = z.object({
  title_en: str(80),
  title_th: str(80),
  title_zh: str(80),
  looking_for_en: str(90).describe("At most 12 words, a noun phrase, not a sentence"),
  looking_for_th: str(90),
  looking_for_zh: str(90),
  category: z.enum(["social", "build", "local_life"]),
  description_en: str(450),
  description_th: str(450),
  description_zh: str(450),
});

// Post a project by describing it; Claude writes the listing in all three languages.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ text: z.string().trim().min(10).max(2000) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "describe your project in 10–2000 characters" }, { status: 400 });

  if (!(await takeQuota(`project:${userId}`, "1 day", 5)))
    return Response.json({ error: "rate_limited" }, { status: 429 });

  let listing;
  try {
    listing = await askJson({
      system: `Turn someone's description of a free collaboration project in Chiang Mai (no pay, no job, just people doing something together) into a listing.
category: social = hanging out/meeting people, build = making or learning something, local_life = everyday Chiang Mai life and culture.
Each description: at most 60 words of facts: what you do, how often or when, where, what to bring. No welcoming phrases, no "it's all about", no "whether you're", no exclamation marks. Title and looking_for in all three languages too. Keep the owner's own wording for the language they wrote in; the other languages are natural native text, not literal translations.`,
      prompt: data("project", body.data.text),
      schema: Listing,
    });
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }

  const { data: project, error } = await createAdminClient()
    .from("projects")
    .insert({
      owner_id: userId,
      title: listing.title_en,
      title_th: listing.title_th,
      title_zh: listing.title_zh,
      description: listing.description_en,
      looking_for: listing.looking_for_en,
      looking_for_th: listing.looking_for_th,
      looking_for_zh: listing.looking_for_zh,
      category: listing.category,
      description_th: listing.description_th,
      description_zh: listing.description_zh,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ project });
}
