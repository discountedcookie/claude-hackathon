"use client";

import { useEffect, useState } from "react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import { scriptLang } from "@/lib/script";

type Kind = "note" | "hello" | "bio" | "mission";

// Translations requested by all <Written> on screen are batched into one call per language.
const cache: Record<string, string | null> = {};
const waiting = new Map<string, ((text: string | null) => void)[]>();
let queued: { lang: Lang; items: { kind: Kind; id: string }[] } | null = null;

function flush() {
  const batch = queued;
  queued = null;
  if (!batch) return;
  fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(batch),
  })
    .then((r) => (r.ok ? r.json() : { translations: {} }))
    .catch(() => ({ translations: {} }))
    .then(({ translations }: { translations: Record<string, string> }) => {
      for (const it of batch.items) {
        const key = `${batch.lang}:${it.kind}:${it.id}`;
        cache[key] = translations[`${it.kind}:${it.id}`] ?? null;
        waiting.get(key)?.forEach((done) => done(cache[key]));
        waiting.delete(key);
      }
    });
}

function request(lang: Lang, kind: Kind, id: string): Promise<string | null> {
  const key = `${lang}:${kind}:${id}`;
  if (key in cache) return Promise.resolve(cache[key]);
  return new Promise((resolve) => {
    const list = waiting.get(key);
    if (list) return list.push(resolve);
    waiting.set(key, [resolve]);
    if (queued && queued.lang !== lang) flush();
    queued ??= { lang, items: [] };
    queued.items.push({ kind, id });
    if (queued.items.length >= 30) flush();
    else setTimeout(flush, 50);
  });
}

// Text a person wrote, shown in the reader's language when it's written in another script.
export default function Written({ kind, id, text, className = "" }: { kind: Kind; id: string; text: string; className?: string }) {
  const t = useT();
  const { lang } = useLang();
  const needs = scriptLang(text) !== lang;
  const [result, setResult] = useState<{ key: string; text: string | null } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const key = `${lang}:${kind}:${id}:${text}`;

  useEffect(() => {
    if (!needs) return;
    let live = true;
    request(lang, kind, id).then((translated) => live && setResult({ key, text: translated }));
    return () => {
      live = false;
    };
  }, [needs, lang, kind, id, key]);

  const translated = needs && result?.key === key ? result.text : null;
  return (
    <span className={`font-reading ${className}`}>
      {translated && !showOriginal ? translated : text}
      {translated && (
        <button onClick={() => setShowOriginal((o) => !o)} className="ml-1.5 text-[11px] font-semibold text-cnx-muted underline">
          {showOriginal ? t(`lang_${lang}`) : t("original")}
        </button>
      )}
    </span>
  );
}
