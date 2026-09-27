"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lang, LangProvider, LangSwitcher, PICKED_LANG_KEY, useLang, useT } from "@/lib/i18n";
import BuddyMascot from "../BuddyMascot";
import Icon from "../Icon";
import Logo from "../Logo";
import SignupChat, { type Draft } from "../SignupChat";

type Line = { role: "user" | "assistant"; text: string };

function Page({ transcript, draft }: { transcript: Line[]; draft: Draft | null }) {
  const t = useT();
  const { lang } = useLang();
  const router = useRouter();

  async function signOut() {
    try {
      localStorage.setItem(PICKED_LANG_KEY, lang);
    } catch {}
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <Logo className="text-xl" />
        <div className="flex items-center gap-1">
          <LangSwitcher />
          <button onClick={signOut} title={t("signOut")} aria-label={t("signOut")} className="rounded-lg p-2 text-cnx-muted hover:text-cnx-ink">
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>
      </header>
      <BuddyMascot className="mx-auto h-24 w-36" />
      <SignupChat transcript={transcript} draft={draft} />
    </main>
  );
}

// For signed-in people who haven't finished onboarding (e.g. came back later, or older accounts).
export default function OnboardingChat({
  me,
  transcript,
  draft,
}: {
  me: { id: string; language: Lang };
  transcript: Line[];
  draft: Draft | null;
}) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <Page transcript={transcript} draft={draft} />
    </LangProvider>
  );
}
