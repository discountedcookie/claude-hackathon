export async function generateSummaries(input: {
  kind: "event" | "project";
  title: string;
  description: string | null;
  extra?: string | null;
}): Promise<{ th: string; zh: string } | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  const base = `${input.title}\n${input.extra ?? ""}\n${input.description ?? ""}`.trim();
  if (!key) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are writing for locals in Chiang Mai about ${input.kind === "event" ? "an event" : "a free collaboration project (no pay, no job — just people building something together)"}. Write a warm, natural summary of what it is and why someone should join — not a translation, a local-friendly rewrite. Under 100 words per language.\n\nReply with JSON only: {"th": "<Thai summary>", "zh": "<Chinese (simplified) summary>"}\n\nData:\n${base}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.content[0].text.match(/\{[\s\S]*\}/)[0]);
    return { th: parsed.th, zh: parsed.zh };
  } catch {
    return null;
  }
}
