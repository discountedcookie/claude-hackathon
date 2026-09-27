"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { detectLang, LangProvider, LangSwitcher, PICKED_LANG_KEY, useLang, useT } from "@/lib/i18n";
import Logo from "../Logo";
import BuddyMascot from "../BuddyMascot";

// Supabase auth errors come in English; map the common ones.
const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "authInvalid",
  email_not_confirmed: "authUnconfirmed",
};

function LoginForm() {
  const router = useRouter();
  const t = useT();
  const { lang, setLang } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Language picked earlier on this device, else the browser's language.
  useEffect(() => {
    const l = detectLang();
    if (l) setLang(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);

  // Sign-in only; new people sign up through the chat on the landing page.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(t(AUTH_ERRORS[error.code ?? ""] ?? "somethingWrong"));
      setBusy(false);
      return;
    }
    // An explicit choice on this page wins over the language saved in the profile.
    let picked: string | null = null;
    try {
      picked = localStorage.getItem(PICKED_LANG_KEY);
    } catch {}
    if (picked === lang) await supabase.from("profiles").update({ language: lang }).eq("id", data.user.id);
    router.push("/events");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-4 p-6 pt-[8vh]">
      <div className="flex justify-end">
        <LangSwitcher />
      </div>
      <BuddyMascot className="mx-auto h-28 w-40" />
      <h1 className="flex h-9 items-center">
        <Link href="/" aria-label="With CNX">
          <Logo className="text-2xl" />
        </Link>
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="cnx-input" type="email" placeholder={t("emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="cnx-input" type="password" placeholder={t("passwordPh")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button disabled={busy} className="cnx-btn w-full">
          {busy ? "…" : t("signIn")}
        </button>
        {error && <p className="text-sm text-cnx-danger">{error}</p>}
      </form>
      <Link href="/" className="flex h-7 items-center text-sm text-cnx-green underline">
        {t("needAccount")}
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <LangProvider initial="en" userId={null}>
      <LoginForm />
    </LangProvider>
  );
}
