"use client";

import Field, { allValid } from "./Field";
import Spinner from "./Spinner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n";
import Icon from "./Icon";
import VoiceInput from "./VoiceInput";
import { useLanguageName, type LanguageSkill } from "./feed-types";

type Line = { role: "user" | "assistant"; text: string };
export type Draft = { display_name: string; interests: string[]; languages: LanguageSkill[] };

const AUTH_ERRORS: Record<string, string> = { email_exists: "authExists", user_already_exists: "authExists", weak_password: "authWeak" };

// Sign-up as a conversation: one message (follow-ups only if name or languages are missing), confirm the parsed
// profile, add a LINE ID. The first message quietly creates a guest account; email + password are optional.
export default function SignupChat({ transcript = [], draft: initialDraft = null }: { transcript?: Line[]; draft?: Draft | null }) {
  const t = useT();
  const { lang } = useLang();
  const languageName = useLanguageName();
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(transcript);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [name, setName] = useState(initialDraft?.display_name ?? "");
  const [langs, setLangs] = useState<string[]>(initialDraft?.languages.map((l) => l.code) ?? []);
  const [interests, setInterests] = useState<string[]>(initialDraft?.interests ?? []);
  const [line, setLine] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guest, setGuest] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message (or the confirm step) in view, like a chat app.
  useEffect(() => {
    if (lines.length || draft) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines.length, busy, draft]);

  // The input grows with the text, up to about five lines.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    let { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      const { error: anonError } = await supabase.auth.signInAnonymously({ options: { data: { language: lang } } });
      if (anonError) {
        setBusy(false);
        return setError(t("somethingWrong"));
      }
      ({ data: session } = await supabase.auth.getSession());
    }
    setGuest(!!session.session?.user.is_anonymous);
    setLines((l) => [...l, { role: "user", text: message }]);
    setText("");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (!res?.ok || !body) {
      if (res?.status === 403) return router.push("/events");
      setLines((l) => l.slice(0, -1));
      setText(message);
      return setError(res?.status === 503 ? t("busy") : t("somethingWrong"));
    }
    setLines((l) => [...l, { role: "assistant", text: body.reply }]);
    if (body.complete && body.draft) {
      setDraft(body.draft);
      setName(body.draft.display_name);
      setLangs(body.draft.languages.map((l: LanguageSkill) => l.code));
      setInterests(body.draft.interests);
    }
  }

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (guest && email.trim()) {
      const { error: upgradeError } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (upgradeError) {
        setBusy(false);
        return setError(t(AUTH_ERRORS[upgradeError.code ?? ""] ?? "somethingWrong"));
      }
    }
    const res = await fetch("/api/onboarding/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ display_name: name.trim(), languages: langs, interests, line_id: line.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(t("somethingWrong"));
    }
    router.push("/events");
    router.refresh();
  }

  const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <div className="space-y-3">
      {[{ role: "assistant", text: t("onbHello") } as Line, ...lines].map((l, i) => (
        <p
          key={i}
          className={`cnx-msg-in max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
            l.role === "assistant" ? "rounded-tl-sm bg-cnx-pale" : "ml-auto rounded-tr-sm bg-cnx-green text-white"
          }`}
        >
          {l.text}
        </p>
      ))}
      {busy && !draft && (
        <p role="status" className="cnx-msg-in flex w-fit items-center gap-1 rounded-2xl rounded-tl-sm bg-cnx-pale px-4 py-3.5">
          <span className="sr-only">{t("thinking")}</span>
          <span className="cnx-dot" />
          <span className="cnx-dot [animation-delay:.15s]" />
          <span className="cnx-dot [animation-delay:.3s]" />
        </p>
      )}

      {!draft ? (
        <form
          onSubmit={send}
          className="flex items-end gap-1 rounded-3xl border border-cnx-line bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-cnx-green focus-within:shadow-md"
        >
          <textarea
            ref={boxRef}
            rows={1}
            className="max-h-36 flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-[#9aa59b]"
            placeholder={t("onbPh")}
            maxLength={400}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line (not while an IME is composing Thai/Chinese).
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            disabled={busy}
          />
          <VoiceInput onText={setText} disabled={busy} />
          <button
            disabled={busy || !text.trim()}
            aria-label={t("send")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cnx-green text-white transition hover:brightness-105 disabled:bg-cnx-line disabled:text-cnx-muted"
          >
            <Icon name="send" className="h-[18px] w-[18px]" />
          </button>
        </form>
      ) : (
        <form onSubmit={finish} className="cnx-msg-in space-y-4 rounded-2xl border border-cnx-line bg-white p-4">
          <p className="font-semibold">{t("onbConfirm")}</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-cnx-muted">{t("onbName")}</span>
            <Field rule="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </label>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-cnx-muted">{t("onbLanguages")}</span>
            <div className="flex flex-wrap gap-1.5">
              {draft.languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLangs((s) => (s.length > 1 || !s.includes(l.code) ? toggle(s, l.code) : s))}
                  className={`cnx-tag ${langs.includes(l.code) ? "" : "line-through opacity-50"}`}
                >
                  {languageName(l.code)} · {t(`lvl_${l.level}`)} {langs.includes(l.code) ? "×" : "+"}
                </button>
              ))}
            </div>
          </div>
          {draft.interests.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-cnx-muted">{t("onbInterests")}</span>
              <div className="flex flex-wrap gap-1.5">
                {draft.interests.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInterests((s) => toggle(s, i))}
                    className={`cnx-tag ${interests.includes(i) ? "" : "line-through opacity-50"}`}
                  >
                    {i} {interests.includes(i) ? "×" : "+"}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-cnx-muted">{t("onbLine")}</span>
            <Field rule="lineId" value={line} onChange={(e) => setLine(e.target.value)} maxLength={21} autoCapitalize="none" required hint={t("onbLineHint")} />
          </label>
          {guest && (
            <details className="text-sm">
              <summary className="cursor-pointer text-cnx-muted">{t("onbEmailOptional")}</summary>
              <div className="mt-2 space-y-2">
                <Field rule="email" optional type="email" autoComplete="email" placeholder={t("emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} />
                <Field
                  rule="password"
                  optional={!email.trim()}
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("passwordPh")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </details>
          )}
          <button
            disabled={
              busy ||
              langs.length === 0 ||
              !allValid([["name", name], ["lineId", line], ["email", email, true], ["password", password, !email.trim()]])
            }
            className="cnx-btn w-full"
          >
            {busy ? <Spinner /> : t("onbFinish")}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-cnx-danger">{error}</p>}
      <div ref={endRef} />
    </div>
  );
}
