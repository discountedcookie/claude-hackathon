"use client";

import { useT } from "@/lib/i18n";
import BuddyMascot from "./BuddyMascot";

export default function Hero({ variant }: { variant: "events" | "projects" }) {
  const t = useT();
  return (
    <section className="mx-auto flex max-w-3xl items-end justify-between gap-4 px-4 pb-2 pt-8 sm:px-6 sm:pt-10">
      <div className="pb-1">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-cnx-muted">
          เชียงใหม่ · CHIANG MAI
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {variant === "events" ? t("heroTitle") : t("heroProjectsTitle")}
        </h1>
        <p className="mt-2 text-sm text-cnx-muted">
          {variant === "events" ? t("heroNote") : t("heroProjectsNote")}
        </p>
      </div>
      <BuddyMascot className="h-28 w-40 shrink-0 sm:h-44 sm:w-60" />
    </section>
  );
}
