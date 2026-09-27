"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { Avatar, LanguageChips, type BuddyRequest, type Person } from "./feed-types";
import Written from "./Written";

// Buddy requests in one place, above everything else: ones waiting for my answer, and ones I sent.
export default function RequestsPanel({
  requests,
  people,
  meId,
  onChange,
  onAccepted,
}: {
  requests: BuddyRequest[];
  people: Record<string, Person>;
  meId: string;
  onChange: () => void;
  onAccepted: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const incoming = requests.filter((r) => r.status === "pending" && r.to_id === meId && r.events);
  const sent = requests.filter((r) => r.status === "pending" && r.from_id === meId && r.events);
  if (!incoming.length && !sent.length) return null;

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    setNotice(null);
    const res = await fetch("/api/buddy/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: id, accept }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) setNotice(t("somethingWrong"));
    onChange();
    if (res?.ok && accept) onAccepted();
  }

  async function withdraw(id: string) {
    setBusy(id);
    const { error } = await createClient().from("buddy_requests").delete().eq("id", id);
    setBusy(null);
    if (error) setNotice(t("somethingWrong"));
    onChange();
  }

  const row = (r: BuddyRequest, mine: boolean) => {
    const p = people[mine ? r.to_id : r.from_id];
    return (
      <li key={r.id} className="cnx-card space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={p?.display_name ?? "?"} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{mine ? p?.display_name : t("wantsToGo", { name: p?.display_name ?? "…" })}</p>
            <p className="truncate text-xs text-cnx-muted">{r.events!.title}</p>
            {p && <LanguageChips languages={p.languages} />}
          </div>
        </div>
        {r.note && <Written kind="hello" id={r.id} text={`“${r.note}”`} className="block text-sm" />}
        {mine ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-cnx-muted">{t("waitingFor", { name: p?.display_name ?? "…" })}</span>
            <button disabled={busy === r.id} onClick={() => withdraw(r.id)} className="text-sm text-cnx-muted underline">
              {t("withdraw")}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button disabled={busy === r.id} onClick={() => respond(r.id, true)} className="cnx-btn flex-1 text-sm">
              {busy === r.id ? "…" : t("accept")}
            </button>
            <button disabled={busy === r.id} onClick={() => respond(r.id, false)} className="cnx-btn-light flex-1 text-sm text-cnx-muted">
              {t("decline")}
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{t("requestsTitle")}</h2>
      <ul className="grid items-start gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {incoming.map((r) => row(r, false))}
        {sent.map((r) => row(r, true))}
      </ul>
      {notice && <p className="text-sm text-cnx-danger">{notice}</p>}
    </section>
  );
}
