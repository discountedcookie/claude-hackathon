"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MatchReview, { Review, Rating } from "./MatchReview";

type Profile = { id: string; display_name: string; line_id: string | null; role: string };
type OfferRow = {
  id: string;
  status: string;
  mission: string | null;
  events: { id: string; title: string; starts_at: string | null; location: string | null; luma_url: string } | null;
};

export default function ForeignerDashboard({ me }: { me: Profile }) {
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [mission, setMission] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [matches, setMatches] = useState<
    {
      id: string;
      offer_id: string;
      profiles: { id: string; display_name: string; line_id: string | null } | null;
      offers: { events: { starts_at: string | null } | null } | null;
    }[]
  >([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, status, mission, events(id, title, starts_at, location, luma_url)")
      .eq("foreigner_id", me.id)
      .order("created_at", { ascending: false });
    setOffers((data as unknown as OfferRow[]) ?? []);

    const { data: m } = await supabase
      .from("matches")
      .select("id, offer_id, offers!inner(foreigner_id, events(starts_at)), profiles:local_id(id, display_name, line_id)")
      .eq("offers.foreigner_id", me.id);
    const matchRows = (m as never) ?? [];
    setMatches(matchRows);

    const peerIds = (matchRows as { profiles: { id: string } | null }[])
      .map((r) => r.profiles?.id)
      .filter(Boolean) as string[];
    if (peerIds.length) {
      const { data: rv } = await supabase
        .from("reviews")
        .select("*")
        .or(`reviewee_id.in.(${peerIds.join(",")}),reviewee_id.eq.${me.id}`);
      const rows = (rv as Review[]) ?? [];
      setReviews(rows);
      const agg: Record<string, { sum: number; count: number }> = {};
      for (const r of rows) {
        const a = (agg[r.reviewee_id] ??= { sum: 0, count: 0 });
        a.sum += r.stars;
        a.count += 1;
      }
      setRatings(
        Object.fromEntries(Object.entries(agg).map(([id, a]) => [id, { avg: a.sum / a.count, count: a.count }])),
      );
    }
  }, [supabase, me.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: setState happens after await
    load();
  }, [load]);

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/parse-luma", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, mission }),
    });
    const body = await res.json();
    setMessage(res.ok ? `Registered: ${body.event.title}` : body.error);
    if (res.ok) {
      setUrl("");
      setMission("");
    }
    setBusy(false);
    load();
  }

  function matchFor(offerId: string) {
    return matches.find((m) => m.offer_id === offerId);
  }

  async function cancelOffer(offerId: string) {
    await supabase.from("offers").delete().eq("id", offerId);
    load();
  }

  async function cancelMatch(matchId: string) {
    await supabase.from("matches").delete().eq("id", matchId);
    load();
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Plus One</h1>
        <span className="text-sm text-gray-500">{me.display_name} · foreigner</span>
      </header>

      <form onSubmit={share} className="mb-8 flex flex-col gap-2">
        <input
          className="rounded border p-2"
          placeholder="paste a lu.ma event link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          className="rounded border p-2"
          placeholder="your mission — why are you going? (e.g. want to meet the Thai dev scene, happy to demo Claude)"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />
        <button disabled={busy} className="rounded bg-black p-2 text-white disabled:opacity-50">
          {busy ? "…" : "Offer plus one"}
        </button>
      </form>
      {message && <p className="mb-4 text-sm">{message}</p>}

      <h2 className="mb-2 font-semibold">My events</h2>
      <ul className="space-y-3">
        {offers.map((o) => {
          const m = matchFor(o.id);
          return (
            <li key={o.id} className="rounded border p-3">
              <a href={o.events?.luma_url} target="_blank" className="font-medium underline">
                {o.events?.title}
              </a>
              <p className="text-sm text-gray-500">
                {o.events?.starts_at ? new Date(o.events.starts_at).toLocaleString() : "date TBD"} · {o.events?.location ?? "venue TBD"}
              </p>
              {o.mission && <p className="mt-1 text-sm italic text-gray-600">{o.mission}</p>}
              {m ? (
                <div className="mt-2 rounded bg-green-50 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      Matched with <b>{m.profiles?.display_name}</b>
                      {m.profiles && <Rating avg={ratings[m.profiles.id]?.avg} count={ratings[m.profiles.id]?.count} />} — LINE:{" "}
                      <b>{m.profiles?.line_id ?? "n/a"}</b>
                    </span>
                    <button onClick={() => cancelMatch(m.id)} className="ml-2 shrink-0 rounded border px-2 py-1 text-xs">
                      Cancel match
                    </button>
                  </div>
                  {m.profiles && o.events && (
                    <MatchReview
                      matchId={m.id}
                      meId={me.id}
                      other={{ id: m.profiles.id, display_name: m.profiles.display_name }}
                      eventStarted={!!m.offers?.events?.starts_at && new Date(m.offers.events.starts_at) < new Date()}
                      myReview={reviews.find((r) => r.match_id === m.id && r.reviewer_id === me.id) ?? null}
                      theirReview={reviews.find((r) => r.match_id === m.id && r.reviewer_id === m.profiles!.id) ?? null}
                      onDone={load}
                    />
                  )}
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-gray-400">Waiting for a local to pick you…</p>
                  <button onClick={() => cancelOffer(o.id)} className="rounded border px-2 py-1 text-xs">
                    Cancel offer
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
