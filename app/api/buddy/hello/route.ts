import { z } from "zod";
import { AiBusy, askJson, data, LANG_NAMES, str } from "@/lib/claude";
import { strongestLanguage, type PersonForAI } from "@/lib/buddies";
import { takeQuota } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";

const Hello = z.object({
  text: str(200).describe("The hello, in the recipient's language"),
  gloss: str(200).describe("The same hello in the sender's language; empty if the languages are the same"),
});

// Drafts the first message of a buddy request in the other person's best language, so language isn't the barrier.
export async function POST(request: Request) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return Response.json({ error: "sign in first" }, { status: 401 });

  const body = z.object({ event_id: z.uuid(), to_id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.to_id === userId) return Response.json({ error: "bad request" }, { status: 400 });

  // Only for someone going to the same event (attendances are readable to signed-in users).
  const [{ data: going }, { data: people }, { data: ev }] = await Promise.all([
    supabase.from("attendances").select("user_id, note").eq("event_id", body.data.event_id).in("user_id", [userId, body.data.to_id]),
    supabase.from("profiles").select("id, display_name, language, bio, interests, offers, wants, languages").in("id", [userId, body.data.to_id]),
    supabase.from("events").select("title, starts_at, location").eq("id", body.data.event_id).maybeSingle(),
  ]);
  if (!ev || (going ?? []).length < 2) return Response.json({ error: "not found" }, { status: 404 });
  const me = (people as PersonForAI[]).find((p) => p.id === userId);
  const them = (people as PersonForAI[]).find((p) => p.id === body.data.to_id);
  if (!me || !them) return Response.json({ error: "not found" }, { status: 404 });

  if (!(await takeQuota(`hello:${userId}`, "1 hour", 20))) return Response.json({ error: "rate_limited" }, { status: 429 });

  const theirLang = strongestLanguage(them);
  const myLang = LANG_NAMES[me.language as keyof typeof LANG_NAMES] ?? LANG_NAMES.en;
  try {
    const hello = await askJson({
      system: `Write the first message one person sends another, asking to go to an event together. At most 2 short sentences, friendly and natural, like a text: say hi, and mention one specific thing you have in common or that the other person said. No "hope this finds you well", no exclamation-mark spam.
Write text in the language with ISO code "${theirLang}". ${theirLang === me.language ? "Leave gloss empty." : `Write gloss as the same message in ${myLang}.`}`,
      prompt: [
        data("event", ev),
        data("person", { role: "sender", ...me, id: undefined, note: going?.find((g) => g.user_id === userId)?.note }),
        data("person", { role: "recipient", ...them, id: undefined, note: going?.find((g) => g.user_id === them.id)?.note }),
      ].join("\n"),
      schema: Hello,
      effort: "low",
      maxTokens: 2000,
    });
    return Response.json({ text: hello.text, gloss: theirLang === me.language ? "" : hello.gloss });
  } catch (e) {
    if (e instanceof AiBusy) return Response.json({ error: "busy" }, { status: 503 });
    throw e;
  }
}
