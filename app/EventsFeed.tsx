"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n";
import Icon from "./Icon";
import BuddyCard from "./BuddyCard";
import EventCard from "./EventCard";
import RequestsPanel from "./RequestsPanel";
import { Faq } from "./ui";
import LocationPicker, { placeName, type Place } from "./LocationPicker";
import type { Review } from "./MatchReview";
import type { BuddyRequest, FeedEvent, LanguageSkill, Person } from "./feed-types";

const LOC_KEY = "cnx-location";

type Feed = {
  events: FeedEvent[];
  attendances: { id: string; event_id: string; user_id: string; note: string | null }[];
  requests: BuddyRequest[];
  people: Record<string, Person>;
  ratings: Record<string, { avg: number; count: number }>;
  reviews: Review[];
  contacts: Record<string, string>;
  count: number;
  me: { languages: LanguageSkill[] } | null;
};
const EMPTY_FEED: Feed = { events: [], attendances: [], requests: [], people: {}, ratings: {}, reviews: [], contacts: {}, count: 0, me: null };

function savedPlace(): Place | null {
  try {
    return JSON.parse(localStorage.getItem(LOC_KEY) ?? "null");
  } catch {
    return null;
  }
}

export default function EventsFeed({ meId }: { meId: string }) {
  const supabase = createClient();
  const t = useT();
  const { lang } = useLang();
  const [place, setPlace] = useState<Place | null>(null);
  const [picking, setPicking] = useState(false);
  const [feed, setFeed] = useState<Feed>(EMPTY_FEED);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openedAt] = useState(() => Date.now());

  function choose(p: Place) {
    try {
      localStorage.setItem(LOC_KEY, JSON.stringify(p));
    } catch {}
    setPlace(p);
    setPicking(false);
  }

  // Browser location, named by reverse geocoding; the picker if it's denied.
  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return setPicking(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lng } = p.coords;
        choose({ lat, lng, label: await placeName(lat, lng, lang) });
      },
      () => setPicking(true),
      { timeout: 10_000 },
    );
  }, [lang]);

  // Where am I: remembered place, else browser location.
  useEffect(() => {
    const saved = savedPlace();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time location bootstrap on mount
    if (!saved) return locate();
    setPlace(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // The place name follows the UI language.
  const placeKey = place ? `${place.lat},${place.lng}` : "";
  useEffect(() => {
    if (!place) return;
    let stale = false;
    placeName(place.lat, place.lng, lang).then((label) => {
      if (!stale && label && label !== place.label) choose({ ...place, label });
    });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on language or coordinates, not on label
  }, [lang, placeKey]);

  // Everything the feed needs comes from one RPC (one round trip, RLS applies).
  // Without a place there are no nearby events, but plans and requests still load.
  // Only the newest request may update the feed, so a slow earlier answer can't overwrite it.
  const latest = useRef(0);
  const load = useCallback(async () => {
    const id = ++latest.current;
    const { data } = await supabase.rpc("get_feed", { p_lat: place?.lat ?? null, p_lng: place?.lng ?? null });
    if (data && id === latest.current) setFeed(data as Feed);
  }, [supabase, place]);

  // Show what's already in the DB right away; import from Luma alongside and refresh only if it added events.
  useEffect(() => {
    load().finally(() => place && setLoading(false));
    if (!place) return;
    fetch("/api/events/nearby", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: place.lat, lng: place.lng }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.imported > 0) load();
      })
      .catch(() => {});
  }, [place, load]);

  // Live updates only for the events on screen (and my own requests), coalesced into one reload.
  const eventIds = feed.events.map((e) => e.id).join(",");
  useEffect(() => {
    if (!place) return;
    let timer: ReturnType<typeof setTimeout>;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    };
    const channel = supabase.channel(`feed:${eventIds.length}`);
    if (eventIds) channel.on("postgres_changes", { event: "*", schema: "public", table: "attendances", filter: `event_id=in.(${eventIds})` }, reload);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "buddy_requests" }, reload).subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, place, eventIds, load]);

  // Summaries are written in the background after import; poll until they arrive (max 3 min).
  const pendingSummaries = feed.events.some((e) => !e.summary_en);
  useEffect(() => {
    if (!pendingSummaries) return;
    const timer = setInterval(load, 8000);
    const stop = setTimeout(() => clearInterval(timer), 180_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [pendingSummaries, load]);

  async function paste(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/parse-luma", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    const errors: Record<string, string> = {
      free_only: t("freeOnly"),
      private_or_unreadable: t("privateEvent"),
      rate_limited: t("rateLimited"),
    };
    setMessage(res?.ok ? `✓ ${body.event.title}` : (errors[body.error] ?? (res?.status === 400 ? t("notLuma") : t("somethingWrong"))));
    if (res?.ok) setUrl("");
    setBusy(false);
    load();
  }

  const { events, requests, people, ratings, reviews, contacts: lines, count } = feed;
  const weekAgo = openedAt - 7 * 24 * 3600_000;
  // Plans stay until reviewed; reviewed ones drop off a week after the event.
  const accepted = requests.filter((r) => {
    if (r.status !== "accepted" || !r.events) return false;
    const reviewed = reviews.some((v) => v.buddy_request_id === r.id && v.reviewer_id === meId);
    return !(reviewed && r.events.starts_at && new Date(r.events.starts_at).getTime() < weekAgo);
  });
  const otherId = (r: BuddyRequest) => (r.from_id === meId ? r.to_id : r.from_id);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-cnx-green">{count > 0 && t("counter", { n: count })}</p>
        <Faq prefix="faqEv" count={6} />
      </div>

      <RequestsPanel
        requests={requests}
        people={people}
        meId={meId}
        onChange={load}
        onAccepted={() => setTimeout(() => document.getElementById("my-buddies")?.scrollIntoView({ behavior: "smooth" }), 600)}
      />

      {accepted.length > 0 && (
        <section id="my-buddies" className="scroll-mt-20 space-y-3">
          <h2 className="text-lg font-bold">{t("myBuddies")}</h2>
          <ul className="grid items-start gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {accepted.map((r) => {
              const other = people[otherId(r)];
              return other ? (
                <BuddyCard
                  key={r.id}
                  req={r}
                  ev={r.events!}
                  other={other}
                  line={lines[other.id] ?? null}
                  meId={meId}
                  rating={ratings[other.id]}
                  reviews={reviews}
                  onChange={load}
                />
              ) : null;
            })}
          </ul>
        </section>
      )}

      {picking || !place ? (
        picking && <LocationPicker onPick={choose} onLocate={locate} onCancel={place ? () => setPicking(false) : undefined} near={place ?? undefined} />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex min-w-0 items-center gap-1.5 text-lg font-bold">
              <Icon name="pin" className="h-5 w-5 shrink-0 text-cnx-green" />
              <span className="truncate">{t("locNear", { place: place.label || `${place.lat.toFixed(2)}, ${place.lng.toFixed(2)}` })}</span>
            </h2>
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <button onClick={locate} title={t("locMine")} aria-label={t("locMine")} className="rounded-lg p-2 text-cnx-muted hover:text-cnx-ink">
                <Icon name="locate" className="h-5 w-5" />
              </button>
              <button onClick={() => setPicking(true)} className="py-1.5 pl-2 text-cnx-muted underline hover:text-cnx-ink">
                {t("locChange")}
              </button>
            </div>
          </div>
          {loading ? (
            <p className="animate-pulse text-sm text-cnx-muted">{t("findingEvents")}</p>
          ) : (
            events.length === 0 && <p className="text-sm text-cnx-muted">{t("nothingYet")}</p>
          )}
          <div className="grid items-start gap-4 md:grid-cols-2 [&>*]:min-w-0">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                meId={meId}
                myLanguages={feed.me?.languages ?? []}
                attendees={feed.attendances
                  .filter((a) => a.event_id === ev.id)
                  .map((a) => ({ ...a, profiles: people[a.user_id] ?? null }))}
                requests={requests.filter((r) => r.event_id === ev.id)}
                ratings={ratings}
                onChange={load}
              />
            ))}
          </div>
        </section>
      )}

      <form onSubmit={paste} className="space-y-2">
        <label htmlFor="luma-url" className="text-sm font-semibold">
          {t("pasteLink")}
        </label>
        <div className="flex gap-2">
          <input id="luma-url" className="cnx-input" placeholder="https://lu.ma/…" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <button disabled={busy} className="cnx-btn shrink-0">
            {busy ? "…" : t("addEvent")}
          </button>
        </div>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
