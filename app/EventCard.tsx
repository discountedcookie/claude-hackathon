"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n";
import Icon from "./Icon";
import { Rating } from "./MatchReview";
import {
  Avatar,
  Clamp,
  EventHeading,
  LanguageChips,
  useLanguageName,
  type Attendance,
  type BuddyRequest,
  type FeedEvent,
  type LanguageSkill,
} from "./feed-types";
import { Section, Sections } from "./ui";
import Written from "./Written";

export default function EventCard({
  ev,
  meId,
  myLanguages,
  attendees,
  requests,
  ratings,
  onChange,
}: {
  ev: FeedEvent;
  meId: string;
  myLanguages: LanguageSkill[];
  attendees: Attendance[];
  requests: BuddyRequest[];
  ratings: Record<string, { avg: number; count: number }>;
  onChange: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const languageName = useLanguageName();
  const supabase = createClient();
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [askNote, setAskNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const mine = attendees.find((a) => a.user_id === meId);
  const others = attendees.filter((a) => a.user_id !== meId && a.profiles);
  const summary = ev[`summary_${lang}`] ?? ev.summary_en;
  const facts = ev.facts?.[lang] ?? [];
  const foreignLanguage = !!ev.language && !myLanguages.some((l) => l.code === ev.language);
  const requestWith = (id: string) => requests.find((r) => r.from_id === id || r.to_id === id);
  const fail = (message?: string) => setNotice(message?.includes("rate_limited") ? t("rateLimited") : t("somethingWrong"));

  async function toggleGoing() {
    setNotice(null);
    // Un-going cancels your plans for this event (DB trigger); make sure that's intended.
    if (mine && requests.some((r) => r.status === "accepted") && !window.confirm(t("confirmUngoing"))) return;
    const { error } = mine
      ? await supabase.from("attendances").delete().eq("event_id", ev.id).eq("user_id", meId)
      : await supabase.from("attendances").insert({ event_id: ev.id });
    if (error) fail(error.message);
    onChange();
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("attendances").update({ note: note.trim() || null }).eq("event_id", ev.id).eq("user_id", meId);
    if (error) return fail(error.message);
    setEditingNote(false);
    onChange();
  }

  async function ask(e: React.FormEvent, toId: string) {
    e.preventDefault();
    setNotice(null);
    // A declined request can be sent again: the old one goes first (unique per pair and event).
    const old = requestWith(toId);
    if (old?.status === "declined") await supabase.from("buddy_requests").delete().eq("id", old.id);
    const { error } = await supabase.from("buddy_requests").insert({ event_id: ev.id, to_id: toId, note: askNote.trim() || null });
    if (error) fail(error.message);
    setAsking(null);
    setAskNote("");
    onChange();
  }

  return (
    <section className="cnx-card flex flex-col gap-4">
      <EventHeading ev={ev} />

      {(ev.language || facts.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {ev.language && <span className={`cnx-tag ${foreignLanguage ? "cnx-tag-warn" : ""}`}>{languageName(ev.language)}</span>}
          {facts.map((f) => (
            <span key={f} className="cnx-tag">
              {f}
            </span>
          ))}
        </div>
      )}

      {summary ? (
        <Clamp text={summary} className="text-[15px] leading-relaxed" />
      ) : (
        <p className="animate-pulse text-sm text-cnx-muted">{t("summaryPending")}</p>
      )}

      {ev.description_raw && (
        <div>
          <button onClick={() => setShowOriginal((o) => !o)} className="text-xs font-semibold text-cnx-muted underline" aria-expanded={showOriginal}>
            {t("original")}
          </button>
          {showOriginal && (
            <p className="font-reading mt-2 max-h-80 overflow-y-auto whitespace-pre-line rounded-xl border border-cnx-line p-3 text-sm">
              {ev.description_raw}
            </p>
          )}
        </div>
      )}

      {others.length > 0 && (
        <Sections>
          <Section
            value="people"
            title={
              <span className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {others.slice(0, 4).map((a) => (
                    <Avatar key={a.user_id} name={a.profiles!.display_name} small />
                  ))}
                </span>
                {t("goingCount", { n: others.length })}
              </span>
            }
          >
            <ul className="space-y-3">
              {others.map((a) => {
                const p = a.profiles!;
                const r = requestWith(p.id);
                return (
                  <li key={p.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.display_name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {p.display_name}
                          <Rating avg={ratings[p.id]?.avg} count={ratings[p.id]?.count} />
                        </p>
                        <LanguageChips languages={p.languages} />
                      </div>
                      {r && r.status !== "declined" ? (
                        <span className="cnx-tag shrink-0">{t(r.status)}</span>
                      ) : (
                        mine && (
                          <button onClick={() => setAsking(asking === p.id ? null : p.id)} className="cnx-btn-light shrink-0 px-3 py-1.5 text-xs">
                            {t("ask")}
                          </button>
                        )
                      )}
                    </div>
                    {p.bio && <Written kind="bio" id={p.id} text={p.bio} className="block pl-13 text-sm text-cnx-muted" />}
                    {a.note && <Written kind="note" id={a.id} text={`“${a.note}”`} className="block pl-13 text-sm" />}
                    {asking === p.id && (
                      <form onSubmit={(e) => ask(e, p.id)} className="flex gap-2 pl-13">
                        <input
                          className="cnx-input text-sm"
                          placeholder={t("askPh")}
                          maxLength={200}
                          value={askNote}
                          onChange={(e) => setAskNote(e.target.value)}
                          autoFocus
                        />
                        <button className="cnx-btn shrink-0 text-sm">{t("ask")}</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        </Sections>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        {mine &&
          (editingNote ? (
            <form onSubmit={saveNote} className="flex w-full gap-2">
              <input
                className="cnx-input text-sm"
                placeholder={t("whyGoingPh")}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              <button className="cnx-btn shrink-0 text-sm">{t("save")}</button>
            </form>
          ) : (
            <button
              onClick={() => {
                setNote(mine.note ?? "");
                setEditingNote(true);
              }}
              className="min-w-0 truncate text-left text-sm text-cnx-muted"
            >
              {mine.note ? <span className="font-reading">“{mine.note}”</span> : <span className="underline">{t("addNote")}</span>}
            </button>
          ))}
        <button onClick={toggleGoing} className={`ml-auto w-full text-sm sm:w-auto ${mine ? "cnx-btn-light font-semibold" : "cnx-btn"}`}>
          {mine && <Icon name="check" className="h-4 w-4" />}
          {mine ? t("going") : t("imGoing")}
        </button>
      </div>

      {notice && <p className="text-sm text-cnx-danger">{notice}</p>}
    </section>
  );
}
