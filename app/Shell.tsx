"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LangProvider, LangSwitcher, useT, Lang } from "@/lib/i18n";
import ProjectsBoard from "./ProjectsBoard";
import ForeignerDashboard from "./ForeignerDashboard";
import LocalDashboard from "./LocalDashboard";

type Profile = {
  id: string;
  display_name: string;
  line_id: string | null;
  role: "foreigner" | "local";
  language: Lang;
};

function ShellInner({ me }: { me: Profile }) {
  const t = useT();
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<"events" | "projects">("events");

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cnx-paper text-cnx-ink">
      <header className="sticky top-0 z-10 border-b border-cnx-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight">
            With · CNX
            <span className="ml-2 hidden text-xs font-medium text-cnx-muted sm:inline">{t("brandTag")}</span>
          </span>
          <nav className="ml-auto flex items-center gap-1">
            {(["events", "projects"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  tab === k ? "font-semibold text-cnx-green underline underline-offset-8 decoration-2" : "text-cnx-muted"
                }`}
              >
                {k === "events" ? t("tabEvents") : t("tabProjects")}
              </button>
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
      {tab === "events" ? (
        me.role === "foreigner" ? (
          <ForeignerDashboard me={me} />
        ) : (
          <LocalDashboard me={me} />
        )
      ) : (
        <ProjectsBoard me={me} />
      )}
    </div>
  );
}

export default function Shell({ me }: { me: Profile }) {
  return (
    <LangProvider initial={me.language} userId={me.id}>
      <ShellInner me={me} />
    </LangProvider>
  );
}
