"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";
import { LangProvider, LangSwitcher, useT, Lang } from "@/lib/i18n";

type Profile = {
  id: string;
  display_name: string;
  language: Lang;
};

function FrameInner({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabs = [
    { href: "/events", label: t("tabEvents") },
    { href: "/projects", label: t("tabProjects") },
  ] as const;

  return (
    <div className="min-h-screen bg-cnx-paper text-cnx-ink">
      <header className="sticky top-0 z-10 border-b border-cnx-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
          <Link href="/events" className="shrink-0 whitespace-nowrap text-lg font-extrabold tracking-tight">
            With · CNX
          </Link>
          <nav className="flex items-center gap-1 sm:ml-4">
            {tabs.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm ${
                  pathname.startsWith(href) ? "bg-cnx-pale font-semibold text-cnx-green" : "text-cnx-muted hover:text-cnx-ink"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LangSwitcher />
            <button onClick={signOut} title={t("signOut")} aria-label={t("signOut")} className="rounded-lg p-2 text-cnx-muted hover:text-cnx-ink">
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function AppFrame({ me, children }: { me: Profile; children: ReactNode }) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <FrameInner>{children}</FrameInner>
    </LangProvider>
  );
}
