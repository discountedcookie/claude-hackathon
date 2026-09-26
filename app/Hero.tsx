"use client";

import { useT } from "@/lib/i18n";
import BuddyMascot from "./BuddyMascot";

export default function Hero({ variant }: { variant: "events" | "projects" }) {
  const t = useT();
  return (
    <section className="mx-auto mt-4 flex max-w-3xl items-center justify-between gap-4 rounded-[22px] border border-cnx-line bg-white px-6 py-5 shadow-sm sm:mx-auto sm:mt-6">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-cnx-muted">
          เชียงใหม่ · CHIANG MAI
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {variant === "events" ? t("heroTitle") : t("heroProjectsTitle")}
        </h1>
        <p className="mt-1 text-sm text-cnx-muted">
          {variant === "events" ? t("heroNote") : t("heroProjectsNote")}
        </p>
      </div>
      <BuddyMascot className="h-24 w-32 shrink-0 sm:h-32 sm:w-44" />
    </section>
  );
}
