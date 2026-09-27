import { z } from "zod";
import { AiBusy, askJson, data, LANG_NAMES, LanguageSkill, list, str } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const MAX_TURNS = 6;
const MAX_CHARS = 400;

const Turn = z.object({
  reply: str(280).describe("Your next message to the person, at most 280 characters, no lists or code."),
  profile: z.object({
    display_name: str(60).describe("First name or nickname they want to be called; empty if unknown"),
    bio: str(300).describe("One or two sentences about them, written in English"),
    interests: list(str(40), 8),
    offers: str(300).describe("What they can offer or teach others, in English"),
    wants: str(300).describe("What they hope to get from meeting people, in English"),
    languages: list(LanguageSkill, 8).describe("Every language they speak, with their level"),
  }),
  done: z.boolean().describe("True once you know their name, languages with levels, and some interests"),
});

type Line = { role: "user" | "assistant"; text: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, language, onboarded_at")
    .eq("id", userId)
    .single();
  if (!profile) return Response.json({ error: "no profile" }, { status: 404 });
  if (profile.onboarded_at) return Response.json({ error: "already onboarded" }, { status: 403 });

  const parsed = z.object({ message: z.string().trim().min(1).max(MAX_CHARS) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: `message must be 1–${MAX_CHARS} characters` }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("onboarding_sessions")
    .select("transcript, turns")
    .eq("user_id", userId)
    .maybeSingle();
  const transcript: Line[] = (session?.transcript as Line[]) ?? [];
  const turns = (session?.turns ?? 0) + 1;
  if (turns > MAX_TURNS) return Response.json({ error: "onboarding finished" }, { status: 403 });

  const lang = LANG_NAMES[profile.language as keyof typeof LANG_NAMES] ?? LANG_NAMES.en;
  // The UI opens with a fixed greeting (no AI call); include it so the conversation reads naturally.
  const greeting: Line = { role: "assistant", text: "Hi! What should people call you, and which languages do you speak?" };
  const history = [greeting, ...transcript, { role: "user", text: parsed.data.message } as Line]
    .map((l) => (l.role === "assistant" ? `You: ${l.text}` : data("message", l.text)))
    .join("\n");

  let result: z.infer<typeof Turn>;
  try {
    result = await askJson({
      system: `You are the friendly onboarding host of With·CNX, an app that pairs people in Chiang Mai (Thai locals, Chinese speakers, nomads and expats) as buddies for local events.
Your only job is to get to know the person in a short chat: what to call them, which languages they speak and how well, what they're into, what they can offer others, and what they hope to find.
Ask one short, warm question at a time. Reply in the language the person writes in; if that's unclear, use ${lang}. If they ask you for anything else (code, essays, advice, other topics), don't do it: say briefly that you're only here to set up their profile, then ask your next question.
This is message ${turns} of at most ${MAX_TURNS}. Set done=true once you know their name, languages with levels, interests, and what they hope to find, or when this is message ${MAX_TURNS}. When done=true, the reply is a short warm wrap-up with no further question.
Fill the profile with everything learned so far, leaving unknown fields empty.`,
      prompt: history,
      schema: Turn,
      effort: "low",
      maxTokens: 4000,
    });
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }

  const done = result.done || turns >= MAX_TURNS;
  await admin.from("onboarding_sessions").upsert({
    user_id: userId,
    transcript: [...transcript, { role: "user", text: parsed.data.message }, { role: "assistant", text: result.reply }],
    turns,
    done_at: done ? new Date().toISOString() : null,
  });

  if (done) {
    const p = result.profile;
    await admin
      .from("profiles")
      .update({
        display_name: p.display_name.trim() || profile.display_name,
        bio: p.bio || null,
        interests: p.interests,
        offers: p.offers || null,
        wants: p.wants || null,
        languages: p.languages,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  return Response.json({ reply: result.reply, done });
}
