"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { detectLang, FIRST_MESSAGE_KEY, LangProvider, LangSwitcher, useLang, useT } from "@/lib/i18n";
import BuddyMascot from "./BuddyMascot";
import Icon from "./Icon";
import Logo from "./Logo";

const STEPS = ["landStep1", "landStep2", "landStep3", "landStep4"] as const;

function Page() {
  const t = useT();
  const router = useRouter();
  const { setLang } = useLang();
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const l = detectLang();
    if (l) setLang(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // The first onboarding answer starts here; sign-up follows and the chat continues with it.
  function start(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (answer.trim()) localStorage.setItem(FIRST_MESSAGE_KEY, answer.trim().slice(0, 400));
    } catch {}
    router.push("/login?mode=signup");
  }

  return (
    <div className="min-h-screen bg-cnx-paper text-cnx-ink">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-3">
          <LangSwitcher />
          <Link href="/login" className="text-sm font-semibold text-cnx-green hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <section className="grid items-center gap-8 py-8 sm:py-14 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[1.5px] text-cnx-orange">เชียงใหม่ · CHIANG MAI</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{t("landTitle")}</h1>
            <p className="text-lg text-cnx-orange">{t("landTag")}</p>
            <p className="max-w-md text-cnx-muted">{t("landSub")}</p>
          </div>

          <div className="cnx-card space-y-4 sm:p-6">
            <BuddyMascot className="mx-auto h-28 w-40" />
            <p className="font-reading rounded-2xl rounded-tl-sm bg-cnx-pale px-4 py-3 text-[15px]">{t("onbHello")}</p>
            <form onSubmit={start} className="flex gap-2">
              <input
                className="cnx-input"
                placeholder={t("onbPh")}
                maxLength={400}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button className="cnx-btn shrink-0" aria-label={t("landStart")}>
                <Icon name="send" className="h-5 w-5" />
              </button>
            </form>
            <button onClick={start} className="cnx-btn w-full">
              {t("landStart")}
            </button>
          </div>
        </section>

        <ol className="grid gap-3 border-t border-cnx-line pt-8 sm:grid-cols-4">
          {STEPS.map((key, i) => (
            <li key={key} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cnx-green text-sm font-bold text-white">{i + 1}</span>
              <span className="text-sm font-semibold">{t(key)}</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}

export default function Landing() {
  return (
    <LangProvider initial="en" userId={null}>
      <Page />
    </LangProvider>
  );
}
