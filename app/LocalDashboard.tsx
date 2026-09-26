"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MatchReview, { Review, Rating } from "./MatchReview";
import { useLang, useT, Lang } from "@/lib/i18n";

type Profile = { id: string; display_name: string; line_id: string | null; role: string };
type OfferRow = {
  id: string;
  status: string;
  mission: string | null;
  events: {
    id: string;
    title: string;
    description: string | null;
    description_th: string | null;
    description_zh: string | null;
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
    events: { title: string; starts_at: string | null; luma_url: string } | null;
  } | null;
};

function localized(
  ev: { description: string | null; description_th: string | null; description_zh: string | null } | null,
  lang: Lang,
): string | null {
  if (!ev) return null;
  if (lang === "th") return ev.description_th ?? ev.description;
  if (lang === "zh") return ev.description_zh ?? ev.description;
  return ev.description;
}

export default function LocalDashboard({ me }: { me: Profile }) {
  const supabase = createClient();
  const t = useT();
  const { lang } = useLang();
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [myMatches, setMyMatches] = useState<MatchRow[]>([]);
  const [matchContacts, setMatchContacts] = useState<Record<string, { id: string; display_name: string; line_id: string | null }>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [missionByEvent, setMissionByEvent] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, status, mission, events(id, title, description, description_th, description_zh, starts_at, location, luma_url), profiles:foreigner_id(display_name)")
      .eq("status", "open");
    setOffers((data as unknown as OfferRow[]) ?? []);

    const { data: m } = await supabase
      .from("matches")
      .select("id, offers(foreigner_id, events(title, starts_at, luma_url))")
      .eq("local_id", me.id);
    const rows = (m as unknown as MatchRow[]) ?? [];
    setMyMatches(rows);

    const contacts: Record<string, { id: string; display_name: string; line_id: string | null }> = {};
    for (const row of rows) {
      const fid = row.offers?.foreigner_id;
      if (fid) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, display_name, line_id")
          .eq("id", fid)
          .single();
        if (p) contacts[row.id] = p;
      }
    }
    setMatchContacts(contacts);

    const peerIds = Object.values(contacts).map((c) => c.id);
    if (peerIds.length) {
      const { data: rv } = await supabase
        .from("reviews")
        .select("*")
        .or(`reviewee_id.in.(${peerIds.join(",")}),reviewee_id.eq.${me.id}`);
      const revRows = (rv as Review[]) ?? [];
      setReviews(revRows);
      const agg: Record<string, { sum: number; count: number }> = {};
      for (const r of revRows) {
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
    setNotice(error ? t("tooSlow") : t("matchedNotice"));
    load();
  }

  async function fit(eventId: string) {
    setNotice(t("askingAI"));
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
    setNotice(`${t("pickedForYou")}: ${body.reason}`);
    claim(body.offer_id, eventId);
  }

  const byEvent = offers.reduce<Record<string, OfferRow[]>>((acc, o) => {
    const key = o.events?.id ?? "unknown";
    (acc[key] ??= []).push(o);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      {notice && <p className="mb-4 rounded-xl bg-cnx-lime/50 p-2 text-sm">{notice}</p>}

      {myMatches.length > 0 && (
        <>
          <h2 className="mb-2 font-semibold">{t("myMatches")}</h2>
          <ul className="mb-8 space-y-4">
            {myMatches.map((m) => (
              <li key={m.id} className="cnx-card bg-cnx-pale">
                <a href={m.offers?.events?.luma_url} target="_blank" className="font-medium underline">
                  {m.offers?.events?.title}
                </a>
                <p className="text-sm text-cnx-muted">
                  {m.offers?.events?.starts_at ? new Date(m.offers.events.starts_at).toLocaleString() : ""}
                </p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>
                    {t("yourHost")}: <b>{matchContacts[m.id]?.display_name}</b>
                    {matchContacts[m.id] && (
                      <Rating
                        avg={ratings[matchContacts[m.id].id]?.avg}
                        count={ratings[matchContacts[m.id].id]?.count}
                      />
                    )}{" "}
                    — LINE: <b>{matchContacts[m.id]?.line_id ?? "n/a"}</b>
                  </span>
                  <button onClick={() => cancelMatch(m.id)} className="ml-2 shrink-0 cnx-btn-light text-xs">
                    {t("cancel")}
                  </button>
                </div>
                {matchContacts[m.id] && (
                  <MatchReview
                    matchId={m.id}
                    meId={me.id}
                    other={{ id: matchContacts[m.id].id, display_name: matchContacts[m.id].display_name }}
                    eventStarted={!!m.offers?.events?.starts_at && new Date(m.offers.events.starts_at) < new Date()}
                    myReview={reviews.find((r) => r.match_id === m.id && r.reviewer_id === me.id) ?? null}
                    theirReview={reviews.find((r) => r.match_id === m.id && r.reviewer_id === matchContacts[m.id].id) ?? null}
                    onDone={load}
                  />
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 font-semibold">{t("eventsWithPlusOne")}</h2>
      {Object.keys(byEvent).length === 0 && (
        <p className="text-sm text-cnx-muted">{t("nothingYet")}</p>
      )}
      <div className="space-y-4">
        {Object.entries(byEvent).map(([eventId, rows]) => {
          const ev = rows[0].events;
          return (
            <section key={eventId} className="cnx-card">
              <a href={ev?.luma_url} target="_blank" className="font-medium underline">
                {ev?.title}
              </a>
              <p className="text-sm text-cnx-muted">
                {ev?.starts_at ? new Date(ev.starts_at).toLocaleString() : "date TBD"} · {ev?.location ?? "venue TBD"}
              </p>
              {localized(ev, lang) && (
                <p className="mt-2 whitespace-pre-line rounded-xl bg-cnx-pale p-3 text-sm">{localized(ev, lang)}</p>
              )}
              <div className="mt-3 space-y-2">
                <input
                  className="cnx-input text-sm"
                  placeholder={t("missionForEvent")}
                  value={missionByEvent[eventId] ?? ""}
                  onChange={(e) => setMissionByEvent((s) => ({ ...s, [eventId]: e.target.value }))}
                />
                {rows.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      with <b>{o.profiles?.display_name}</b>
                      {o.mission && <span className="block italic text-cnx-muted">{o.mission}</span>}
                    </span>
                    <button onClick={() => claim(o.id, eventId)} className="cnx-btn shrink-0 px-3 py-1.5">
                      {t("pickThem")}
                    </button>
                  </div>
                ))}
                {rows.length > 1 && (
                  <button onClick={() => fit(eventId)} className="cnx-btn-light w-full text-sm">
                    {t("whoFitsMe")} ({rows.length})
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
