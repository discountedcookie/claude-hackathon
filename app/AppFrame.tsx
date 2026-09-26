"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { LangProvider, LangSwitcher, useT, Lang } from "@/lib/i18n";

type Profile = {
  id: string;
  display_name: string;
  line_id: string | null;
  role: "foreigner" | "local";
  language: Lang;
};

function FrameInner({ me, children }: { me: Profile; children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cnx-paper text-cnx-ink">
      <header className="sticky top-0 z-10 border-b border-cnx-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/events" className="text-lg font-extrabold tracking-tight">
            With · CNX
            <span className="ml-2 hidden text-xs font-medium text-cnx-muted sm:inline">{t("brandTag")}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {(
              [
                { href: "/events", label: t("tabEvents") },
                { href: "/projects", label: t("tabProjects") },
              ] as const
            ).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-xl px-3 py-2 text-sm ${
                  pathname.startsWith(href)
                    ? "font-semibold text-cnx-green underline decoration-2 underline-offset-8"
                    : "text-cnx-muted"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <LangSwitcher />
          <span className="hidden text-xs text-cnx-muted sm:inline">
            {me.display_name} · {me.role}
          </span>
          <button onClick={signOut} className="text-xs text-cnx-muted underline">
            {t("signOut")}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function AppFrame({ me, children }: { me: Profile; children: ReactNode }) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <FrameInner me={me}>{children}</FrameInner>
    </LangProvider>
  );
}
