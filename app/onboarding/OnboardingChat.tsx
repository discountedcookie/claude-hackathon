"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lang, LangProvider, LangSwitcher, useT } from "@/lib/i18n";
import BuddyMascot from "../BuddyMascot";
import Icon from "../Icon";

type Line = { role: "user" | "assistant"; text: string };

const MAX_TURNS = 6;

function Chat({ transcript, turns }: { transcript: Line[]; turns: number }) {
  const t = useT();
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(transcript);
  const [used, setUsed] = useState(turns);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    setBusy(true);
    setError(null);
    setLines((l) => [...l, { role: "user", text: message }]);
    setText("");
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setLines((l) => l.slice(0, -1));
      setText(message);
      setError(res.status === 503 ? t("busy") : t("somethingWrong"));
      if (res.status === 403) router.push("/events");
      return;
    }
    setLines((l) => [...l, { role: "assistant", text: body.reply }]);
    setUsed((u) => u + 1);
    if (body.done) {
      setDone(true);
      setTimeout(() => router.push("/events"), 2500);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("onbTitle")}</h1>
        <LangSwitcher />
      </header>
      <BuddyMascot className="mx-auto h-24 w-36" />
      <div className="flex-1 space-y-3">
        {[{ role: "assistant", text: t("onbHello") } as Line, ...lines].map((l, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
              l.role === "assistant" ? "cnx-card p-3" : "ml-auto bg-cnx-green text-white"
            }`}
          >
            {l.text}
          </p>
        ))}
        {busy && <p className="cnx-card w-16 p-3 text-center text-sm">…</p>}
        {done && <p className="text-center text-sm font-semibold text-cnx-green">{t("onbDone")}</p>}
      </div>
      {!done && (
        <form onSubmit={send} className="sticky bottom-4 space-y-1">
          <div className="flex gap-2">
            <input
              className="cnx-input"
              placeholder={t("onbPh")}
              maxLength={400}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              autoFocus
            />
            <button disabled={busy || !text.trim()} className="cnx-btn shrink-0">
              <Icon name="send" className="h-5 w-5" />
            </button>
          </div>
          <p className="text-right text-xs text-cnx-muted">
            {t("onbLeft", { n: MAX_TURNS - used })}
          </p>
          {error && <p className="text-sm text-cnx-danger">{error}</p>}
        </form>
      )}
    </main>
  );
}

export default function OnboardingChat({
  me,
  transcript,
  turns,
}: {
  me: { id: string; language: Lang };
  transcript: Line[];
  turns: number;
}) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <Chat transcript={transcript} turns={turns} />
    </LangProvider>
  );
}
