"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; display_name: string; line_id: string | null; role: string };
type OfferRow = {
  id: string;
  status: string;
  mission: string | null;
  events: {
    id: string;
    title: string;
    description_th: string | null;
    starts_at: string | null;
    location: string | null;
    luma_url: string;
  } | null;
  profiles: { display_name: string } | null;
};
type MatchRow = {
  id: string;
  offers: {
    foreigner_id: string;
    events: { title: string; starts_at: string | null } | null;
  } | null;
};

export default function LocalDashboard({ me }: { me: Profile }) {
  const supabase = createClient();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [myMatches, setMyMatches] = useState<MatchRow[]>([]);
  const [matchContacts, setMatchContacts] = useState<Record<string, { display_name: string; line_id: string | null }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [missionByEvent, setMissionByEvent] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, status, mission, events(id, title, description_th, starts_at, location, luma_url), profiles:foreigner_id(display_name)")
      .eq("status", "open");
    setOffers((data as unknown as OfferRow[]) ?? []);

    const { data: m } = await supabase
      .from("matches")
      .select("id, offers(foreigner_id, events(title, starts_at))")
      .eq("local_id", me.id);
    const rows = (m as unknown as MatchRow[]) ?? [];
    setMyMatches(rows);

    const contacts: Record<string, { display_name: string; line_id: string | null }> = {};
    for (const row of rows) {
      const fid = row.offers?.foreigner_id;
      if (fid) {
        const { data: p } = await supabase
          .from("profiles")
          .select("display_name, line_id")
          .eq("id", fid)
          .single();
        if (p) contacts[row.id] = p;
      }
    }
    setMatchContacts(contacts);
  }, [supabase, me.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: setState happens after await
    load();
    const channel = supabase
      .channel("offers-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  async function cancelMatch(matchId: string) {
    await supabase.from("matches").delete().eq("id", matchId);
    load();
  }

  async function claim(offerId: string, eventId: string) {
    setNotice(null);
    const { error } = await supabase.from("matches").insert({
      offer_id: offerId,
      local_id: me.id,
      local_mission: missionByEvent[eventId] || null,
    });
    setNotice(error ? "Too slow — someone just took that one." : "Matched! Check above for their LINE id.");
    load();
  }

  async function fit(eventId: string) {
    setNotice("Asking who fits you best…");
    const res = await fetch("/api/match-suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event_id: eventId, mission: missionByEvent[eventId] ?? "" }),
    });
    const body = await res.json();
    if (!res.ok || !body.offer_id) {
      setNotice(body.error ?? "Could not suggest a match.");
      return;
    }
    setNotice(`Picked for you: ${body.reason}`);
    claim(body.offer_id, eventId);
  }

  const byEvent = offers.reduce<Record<string, OfferRow[]>>((acc, o) => {
    const key = o.events?.id ?? "unknown";
    (acc[key] ??= []).push(o);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Plus One</h1>
        <span className="text-sm text-gray-500">{me.display_name} · local</span>
      </header>

      {notice && <p className="mb-4 rounded bg-blue-50 p-2 text-sm">{notice}</p>}

      {myMatches.length > 0 && (
        <>
          <h2 className="mb-2 font-semibold">My matches</h2>
          <ul className="mb-8 space-y-3">
            {myMatches.map((m) => (
              <li key={m.id} className="rounded border border-green-300 bg-green-50 p-3">
                <b>{m.offers?.events?.title}</b>
                <p className="text-sm text-gray-600">
                  {m.offers?.events?.starts_at ? new Date(m.offers.events.starts_at).toLocaleString() : ""}
                </p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>
                    Your host: <b>{matchContacts[m.id]?.display_name}</b> — LINE:{" "}
                    <b>{matchContacts[m.id]?.line_id ?? "n/a"}</b>
                  </span>
                  <button onClick={() => cancelMatch(m.id)} className="ml-2 shrink-0 rounded border px-2 py-1 text-xs">
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 font-semibold">Events with a free plus one</h2>
      {Object.keys(byEvent).length === 0 && (
        <p className="text-sm text-gray-400">Nothing yet — check back soon.</p>
      )}
      <div className="space-y-4">
        {Object.entries(byEvent).map(([eventId, rows]) => {
          const ev = rows[0].events;
          return (
            <section key={eventId} className="rounded border p-3">
              <a href={ev?.luma_url} target="_blank" className="font-medium underline">
                {ev?.title}
              </a>
              <p className="text-sm text-gray-500">
                {ev?.starts_at ? new Date(ev.starts_at).toLocaleString() : "date TBD"} · {ev?.location ?? "venue TBD"}
              </p>
              {ev?.description_th && (
                <p className="mt-2 whitespace-pre-line rounded bg-amber-50 p-2 text-sm">{ev.description_th}</p>
              )}
              <div className="mt-3 space-y-2">
                <input
                  className="rounded border p-1 text-sm"
                  placeholder="your mission for this event — why are you going?"
                  value={missionByEvent[eventId] ?? ""}
                  onChange={(e) => setMissionByEvent((s) => ({ ...s, [eventId]: e.target.value }))}
                />
                {rows.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      with <b>{o.profiles?.display_name}</b>
                      {o.mission && <span className="block italic text-gray-500">{o.mission}</span>}
                    </span>
                    <button onClick={() => claim(o.id, eventId)} className="shrink-0 rounded bg-black px-3 py-1 text-white">
                      Pick them
                    </button>
                  </div>
                ))}
                {rows.length > 1 && (
                  <button onClick={() => fit(eventId)} className="w-full rounded border p-1 text-sm">
                    Who fits me? (AI picks from {rows.length})
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
