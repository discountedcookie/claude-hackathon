"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; display_name: string; line_id: string | null; role: string };
type OfferRow = {
  id: string;
  status: string;
  events: { id: string; title: string; starts_at: string | null; location: string | null; luma_url: string } | null;
};

export default function ForeignerDashboard({ me }: { me: Profile }) {
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [matches, setMatches] = useState<
    { offer_id: string; profiles: { display_name: string; line_id: string | null } | null }[]
  >([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, status, events(id, title, starts_at, location, luma_url)")
      .eq("foreigner_id", me.id)
      .order("created_at", { ascending: false });
    setOffers((data as unknown as OfferRow[]) ?? []);

    const { data: m } = await supabase
      .from("matches")
      .select("offer_id, offers!inner(foreigner_id), profiles:local_id(display_name, line_id)")
      .eq("offers.foreigner_id", me.id);
    setMatches((m as never) ?? []);
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
      body: JSON.stringify({ url }),
    });
    const body = await res.json();
    setMessage(res.ok ? `Registered: ${body.event.title}` : body.error);
    if (res.ok) setUrl("");
    setBusy(false);
    load();
  }

  function matchFor(offerId: string) {
    return matches.find((m) => m.offer_id === offerId);
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Plus One</h1>
        <span className="text-sm text-gray-500">{me.display_name} · foreigner</span>
      </header>

      <form onSubmit={share} className="mb-8 flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          placeholder="paste a lu.ma event link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button disabled={busy} className="rounded bg-black px-4 text-white disabled:opacity-50">
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
              {m ? (
                <p className="mt-2 rounded bg-green-50 p-2 text-sm">
                  Matched with <b>{m.profiles?.display_name}</b> — LINE: <b>{m.profiles?.line_id ?? "n/a"}</b>
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-400">Waiting for a local to pick you…</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
