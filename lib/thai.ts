export async function generateThaiDescription(input: {
  title: string;
  description: string | null;
  starts_at: string | null;
  location: string | null;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  const base = `${input.title}\n${input.location ?? ""}\n${input.starts_at ?? ""}\n${input.description ?? ""}`.trim();
  if (!key) {
    return `[คำอธิบายภาษาไทยจะถูกสร้างด้วย AI เมื่อตั้งค่า ANTHROPIC_API_KEY]\n${base}`;
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are writing for Thai locals in Chiang Mai who want to try expat/nomad events but feel unsure. Rewrite this event listing in warm, natural Thai (not a translation — a local-friendly rewrite): what it is, what vibe to expect, whether you need English, what to wear/bring, and one friendly nudge to come. Keep it under 120 words.\n\nEvent data:\n${base}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM call failed: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? base;
}
