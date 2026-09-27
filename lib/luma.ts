// Luma's public web endpoints (unofficial; the official API only covers calendars you own).

const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  accept: "application/json",
};

export type LumaEvent = {
  luma_url: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  is_free: boolean;
  is_public: boolean;
  description: string | null;
};

type LumaEntry = {
  event: {
    name: string;
    url: string;
    start_at?: string;
    end_at?: string;
    timezone?: string;
    cover_url?: string;
    visibility?: string;
    location_type?: string;
    coordinate?: { latitude: number; longitude: number } | null;
    geo_address_info?: {
      address?: string;
      sublocality?: string;
      city_state?: string;
    } | null;
  };
  ticket_info?: { is_free?: boolean } | null;
  description_mirror?: unknown;
};

export function normalizeLumaUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (!/(^|\.)lu\.ma$|(^|\.)luma\.com$/.test(url.hostname)) throw new Error("not a Luma URL");
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (!/^\/[a-z0-9-]+$/i.test(path)) throw new Error("not a Luma event URL");
  return `https://lu.ma${path}`;
}

// Luma descriptions are ProseMirror documents; flatten them to plain text.
function proseToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hard_break") return "\n";
  const inner = (n.content ?? []).map(proseToText).join("");
  return ["paragraph", "heading", "list_item", "blockquote"].includes(n.type ?? "") ? `${inner}\n` : inner;
}

function toLumaEvent(entry: LumaEntry): LumaEvent {
  const ev = entry.event;
  const geo = ev.geo_address_info;
  const description = proseToText(entry.description_mirror).replace(/\n{3,}/g, "\n\n").trim();
  return {
    luma_url: `https://lu.ma/${ev.url.toLowerCase()}`,
    title: ev.name,
    starts_at: ev.start_at ?? null,
    ends_at: ev.end_at ?? null,
    timezone: ev.timezone ?? null,
    location:
      ev.location_type === "online"
        ? "Online"
        : geo?.address ?? ([geo?.sublocality, geo?.city_state].filter(Boolean).join(", ") || null),
    lat: ev.coordinate?.latitude ?? null,
    lng: ev.coordinate?.longitude ?? null,
    image_url: ev.cover_url ?? null,
    is_free: entry.ticket_info?.is_free ?? false,
    is_public: ev.visibility === "public",
    description: description || null,
  };
}

export async function fetchLumaEvent(url: string): Promise<LumaEvent> {
  const slug = new URL(url).pathname.slice(1);
  const res = await fetch(`https://api.lu.ma/url?url=${encodeURIComponent(slug)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Luma lookup failed: ${res.status}`);
  const body = (await res.json()) as { kind?: string; data?: LumaEntry };
  if (body.kind !== "event" || !body.data?.event) throw new Error("not an event page");
  return toLumaEvent(body.data);
}

// Upcoming in-person events near a point, without descriptions (fetch those per event).
export async function fetchNearbyEvents(lat: number, lng: number): Promise<LumaEvent[]> {
  const res = await fetch(
    `https://api.lu.ma/discover/get-paginated-events?latitude=${lat}&longitude=${lng}&pagination_limit=50`,
    { headers: HEADERS },
  );
  if (!res.ok) throw new Error(`Luma discover failed: ${res.status}`);
  const body = (await res.json()) as { entries?: LumaEntry[] };
  return (body.entries ?? [])
    .map(toLumaEvent)
    .filter((e) => e.is_public && e.lat != null && e.lng != null);
}
