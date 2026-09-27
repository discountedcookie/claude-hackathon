"use client";

import { useEffect, useRef, useState } from "react";
import { useDateParts, useLang, useT, type Lang } from "@/lib/i18n";
import Icon from "./Icon";

export type LanguageSkill = { code: string; level: "basic" | "conversational" | "fluent" | "native" };

export type Person = {
  id: string;
  display_name: string;
  interests: string[];
  languages: LanguageSkill[];
};

export type FeedEvent = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  luma_url: string;
  description_raw: string | null;
  summary_en: string | null;
  summary_th: string | null;
  summary_zh: string | null;
  language?: string | null;
  facts?: Record<Lang, string[]> | null;
};

// Current intro shape is { meet, openers }; rows written before that have { meet_suggestion, icebreakers }.
export type IntroCard = {
  meet?: string;
  openers?: string[];
  meet_suggestion?: string;
  icebreakers?: string[];
};

export type BuddyRequest = {
  id: string;
  event_id: string;
  from_id: string;
  to_id: string;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  icebreakers: Record<string, IntroCard> | null;
  events: FeedEvent | null;
};

export type Attendance = { event_id: string; user_id: string; note: string | null; profiles: Person | null };

const DISPLAY_LOCALE: Record<Lang, string> = { en: "en", th: "th", zh: "zh-Hans" };

// "Thai", "ไทย", "泰语" for an ISO code, in the app's language.
export function useLanguageName() {
  const { lang } = useLang();
  return (code: string) => {
    try {
      return new Intl.DisplayNames([DISPLAY_LOCALE[lang]], { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
}

export function LanguageChips({ languages }: { languages: LanguageSkill[] }) {
  const t = useT();
  const name = useLanguageName();
  if (!languages?.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {languages.map((l) => (
        <span key={l.code} className="cnx-tag">
          {name(l.code)} · {t(`lvl_${l.level}`)}
        </span>
      ))}
    </span>
  );
}

// Date tile + title, time and one-line venue.
export function EventHeading({ ev }: { ev: FeedEvent }) {
  const t = useT();
  const parts = useDateParts();
  const d = ev.starts_at ? parts(ev.starts_at, ev.timezone) : null;
  return (
    <div className="flex gap-3">
      <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-cnx-pale text-cnx-green">
        <span className="text-2xl font-bold leading-none">{d?.day ?? "?"}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase">{d?.month ?? ""}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-cnx-muted">{d ? `${d.weekday} ${d.time}` : t("dateTbd")}</p>
        <a href={ev.luma_url} target="_blank" className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight hover:underline">
          {ev.title}
        </a>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-cnx-muted">
          <Icon name="pin" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{ev.location ?? t("venueTbd")}</span>
        </p>
      </div>
    </div>
  );
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = [...name.trim()].slice(0, 2).join("").toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-cnx-pale font-semibold text-cnx-green ring-2 ring-white ${
        small ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-sm"
      }`}
    >
      {initials}
    </span>
  );
}

export function Clamp({ text, className = "" }: { text: string; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Measure instead of counting characters: Chinese fills 3 lines with far fewer characters than English.
  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);

  return (
    <div className={className}>
      <p ref={ref} className={`font-reading whitespace-pre-line ${open ? "" : "line-clamp-3"}`}>
        {text}
      </p>
      {(overflows || open) && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-xs font-semibold text-cnx-green">
          {open ? t("less") : t("more")}
        </button>
      )}
    </div>
  );
}
