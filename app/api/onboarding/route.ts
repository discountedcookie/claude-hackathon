import { z } from "zod";
import { AiBusy, askJson, data, LANG_NAMES, LanguageSkill, list, str } from "@/lib/claude";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

// One message is usually enough; follow-up questions only for what's missing.
const MAX_TURNS = 4;
const MAX_CHARS = 400;
export const ONBOARDING_OPENER =
  "Tell us about yourself, in any language: your name, which languages you speak, and what you're into.";

export const Profile = z.object({
  display_name: str(60).describe("First name or nickname; empty if unknown"),
  bio: str(200).describe("One short sentence about them in English, e.g. 'Designer from Shanghai who loves street photography'"),
  interests: list(str(30), 6),
  offers: str(200).describe("What they can offer or teach others, in English; empty if unknown"),
  wants: str(200).describe("What they hope to get from meeting people, in English; empty if unknown"),
  languages: list(LanguageSkill, 6).describe("Every language they mention, with a level inferred from how they describe it"),
});

const Turn = z.object({
  complete: z.boolean().describe("True when you know their name and at least one language"),
  reply: str(200).describe(
    "If complete: a short friendly line using their name, no question. If not: one short, natural question for what's missing (name or languages), reacting to what they said.",
  ),
  profile: Profile,
});

type Line = { role: "user" | "assistant"; text: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("language, onboarded_at").eq("id", userId).single();
  if (!me) return Response.json({ error: "no profile" }, { status: 404 });
  if (me.onboarded_at) return Response.json({ error: "already onboarded" }, { status: 403 });

  const parsed = z.object({ message: z.string().trim().min(1).max(MAX_CHARS) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: `message must be 1–${MAX_CHARS} characters` }, { status: 400 });

  const admin = createAdminClient();
  const { data: session } = await admin.from("onboarding_sessions").select("transcript, turns").eq("user_id", userId).maybeSingle();
  const transcript: Line[] = (session?.transcript as Line[]) ?? [];
  const turns = (session?.turns ?? 0) + 1;
  if (turns > MAX_TURNS) return Response.json({ error: "onboarding finished" }, { status: 403 });

  const lang = LANG_NAMES[me.language as keyof typeof LANG_NAMES] ?? LANG_NAMES.en;
  const history = [{ role: "assistant", text: ONBOARDING_OPENER } as Line, ...transcript, { role: "user", text: parsed.data.message } as Line]
    .map((l) => (l.role === "assistant" ? `You: ${l.text}` : data("message", l.text)))
    .join("\n");

  let result: z.infer<typeof Turn>;
  try {
    result = await askJson({
      system: `You set up profiles for With CNX, an app that finds people in Chiang Mai (Thai locals, Chinese speakers, nomads and expats) a buddy for local events.
From the conversation, fill in their profile with everything they've said so far. Infer language levels from how they describe them ("a little Thai" = basic).
You only need their name and at least one language. If either is missing, ask for it in one short, natural sentence that reacts to what they said, like a friendly person would. Never ask for anything else, never list fields.
If they ask you for anything unrelated (code, advice, other topics), don't do it; say you're just setting up their profile and ask for what's missing.
Reply in the language they write in; if unclear, in ${lang}. This is message ${turns} of at most ${MAX_TURNS}.`,
      prompt: history,
      schema: Turn,
      effort: "low",
      maxTokens: 4000,
    });
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }

  const complete = result.complete || turns >= MAX_TURNS;
  await admin.from("onboarding_sessions").upsert({
    user_id: userId,
    transcript: [...transcript, { role: "user", text: parsed.data.message }, { role: "assistant", text: result.reply }],
    turns,
    draft: result.profile,
  });

  return Response.json({ reply: result.reply, complete, draft: complete ? result.profile : null });
}
