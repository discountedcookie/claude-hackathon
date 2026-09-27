"use client";

import { useT } from "@/lib/i18n";
import BuddyMascot from "./BuddyMascot";

export default function Hero({ variant }: { variant: "events" | "projects" }) {
  const t = useT();
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-8">
      <div className="flex items-end justify-between gap-4 sm:rounded-3xl sm:bg-cnx-pale/60 sm:px-8 sm:py-7">
        <div className="pb-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-cnx-muted">เชียงใหม่ · CHIANG MAI</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            {variant === "events" ? t("heroTitle") : t("heroProjectsTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-cnx-muted">{variant === "events" ? t("heroNote") : t("heroProjectsNote")}</p>
        </div>
        <BuddyMascot className="h-20 w-28 shrink-0 sm:h-40 sm:w-56" />
      </div>
    </section>
  );
}
