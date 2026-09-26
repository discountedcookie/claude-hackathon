import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "sign in first" }, { status: 401 });

  const { event_id, mission } = await request.json();
  const { data: offers } = await supabase
    .from("offers")
    .select("id, mission, profiles:foreigner_id(display_name)")
    .eq("event_id", event_id)
    .eq("status", "open");
  if (!offers?.length)
    return Response.json({ error: "no open offers" }, { status: 404 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key)
    return Response.json({ offer_id: offers[0].id, reason: "no AI key — first offer" });

  const list = offers
    .map(
      (o, i) =>
        `${i + 1}. mission: ${o.mission ?? "(none)"}`,
    )
    .join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `A Thai local is going to an event with this mission: "${mission}".\nThese foreigners offered to bring a plus-one:\n${list}\n\nPick the ONE foreigner whose mission best complements the local's mission (complementary beats identical — a learner matches a teacher). Reply with JSON only: {"pick": <number>, "reason": "<one short sentence, warm tone>"}`,
        },
      ],
    }),
  });
  if (!res.ok)
    return Response.json({ offer_id: offers[0].id, reason: "AI unavailable — first offer" });
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    const offer = offers[Number(parsed.pick) - 1] ?? offers[0];
    return Response.json({ offer_id: offer.id, reason: parsed.reason });
  } catch {
    return Response.json({ offer_id: offers[0].id, reason: "AI parse fallback" });
  }
}
