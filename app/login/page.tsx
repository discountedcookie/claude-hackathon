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
  user_already_exists: "authExists",
  weak_password: "authWeak",
};

function LoginForm() {
  const router = useRouter();
  const t = useT();
  const { lang, setLang } = useLang();

  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Language picked earlier / browser language; "Get started" on the landing page opens sign-up.
  useEffect(() => {
    const l = detectLang();
    if (l) setLang(l);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once on mount
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    setBusy(true);
    setError(null);
    if (mode === "signin") {
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
    } else {
      // The profile + contact rows are created by a DB trigger from this metadata.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim(), line_id: lineId.trim(), language: lang },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(t(AUTH_ERRORS[error.code ?? ""] ?? "somethingWrong"));
        setBusy(false);
        return;
      }
      if (!data.session) {
        setNotice(t("checkEmail"));
        setMode("signin");
        setBusy(false);
        return;
      }
    }
    router.push("/events");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full flex min-h-screen max-w-sm flex-col gap-4 p-6 pt-[8vh]">
      <div className="flex justify-end">
        <LangSwitcher />
      </div>
      <BuddyMascot className="mx-auto h-28 w-40" />
      <h1 className="flex h-9 items-center">
        <Link href="/" aria-label="With CNX">
          <Logo className="text-2xl" />
        </Link>
      </h1>
      <p className="flex h-7 items-center text-sm text-cnx-muted">
        {mode === "signin" ? t("signIn") : t("signUp")} —{" "}
        <button className="underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? t("needAccount") : t("haveAccount")}
        </button>
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="cnx-input" type="email" placeholder={t("emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="cnx-input" type="password" placeholder={t("passwordPh")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {mode === "signup" && (
          <>
            <input className="cnx-input" placeholder={t("namePh")} maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <input className="cnx-input" placeholder={t("linePh")} maxLength={60} value={lineId} onChange={(e) => setLineId(e.target.value)} required />
          </>
        )}
        <button disabled={busy} className="cnx-btn w-full">
          {busy ? "…" : mode === "signin" ? t("signIn") : t("signUp")}
        </button>
        {notice && <p className="rounded-xl bg-cnx-lime/50 p-2 text-sm">{notice}</p>}
        {error && <p className="text-sm text-cnx-danger">{error}</p>}
      </form>
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
