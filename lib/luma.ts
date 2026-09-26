export type ParsedLumaEvent = {
  luma_url: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  location: string | null;
  image_url: string | null;
};

export function normalizeLumaUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (!/(^|\.)lu\.ma$|(^|\.)luma\.com$/.test(url.hostname))
    throw new Error("not a Luma URL");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (!/^\/[a-z0-9-]+$/i.test(path)) throw new Error("not a Luma event URL");
  return `https://lu.ma${path}`;
}

export async function fetchLumaEvent(url: string): Promise<ParsedLumaEvent> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Luma fetch failed: ${res.status}`);
  const html = await res.text();

  const { Defuddle } = await import("defuddle/node");
  const article = await Defuddle(html, url);

  const jsonLdBlocks = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const eventLd = jsonLdBlocks.find(
    (b) => b?.["@type"] === "Event" || b?.["@type"]?.includes?.("Event"),
  );

  const og = (prop: string) =>
    html.match(
      new RegExp(`<meta[^>]*property="og:${prop}"[^>]*content="([^"]*)"`, "i"),
    )?.[1] ?? null;

  const title =
    article.title ||
    og("title")?.replace(/\s*·\s*Luma\s*$/, "") ||
    "Untitled event";

  return {
    luma_url: url,
    title,
    description: article.content ? article.description ?? null : null,
    starts_at: eventLd?.startDate ?? null,
    location:
      typeof eventLd?.location?.name === "string"
        ? eventLd.location.name
        : typeof eventLd?.location === "string"
          ? eventLd.location
          : (og("latitude") && og("longitude")
              ? `${og("latitude")},${og("longitude")}`
              : null),
    image_url: article.image ?? og("image"),
  };
}
