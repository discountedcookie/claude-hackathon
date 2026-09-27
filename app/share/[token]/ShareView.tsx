"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lang, LangProvider, LangSwitcher, useT } from "@/lib/i18n";
import type { Point } from "../../MapView";
import Logo from "../../Logo";

const MapView = dynamic(() => import("../../MapView"), { ssr: false });

type Session = { display_name: string; event_title: string; venue: string | null; lat: number | null; lng: number | null; closes_at: string };

function Live({ token, session }: { token: string; session: Session | null }) {
  const t = useT();
  const [pos, setPos] = useState<(Point & { t: number }) | null>(null);
  const [ended, setEnded] = useState(!session);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`share:${token}`)
      .on("broadcast", { event: "pos" }, ({ payload }) => setPos(payload))
      .on("broadcast", { event: "ended" }, () => setEnded(true))
      .subscribe();
    const tick = setInterval(() => {
      setNow(Date.now());
      if (Date.now() > new Date(session.closes_at).getTime()) setEnded(true);
    }, 1000);
    return () => {
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [token, session]);

  const venue = session?.lat != null && session?.lng != null ? { lat: session.lat, lng: session.lng } : null;

  return (
    <main className="mx-auto w-full max-w-lg space-y-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg">
          <Logo />
        </h1>
        <LangSwitcher />
      </header>
      {ended || !session ? (
        <p className="cnx-card text-center font-semibold">{t("shareEnded")}</p>
      ) : (
        <>
          <p className="text-sm font-semibold">
            {t("shareOf", { name: session.display_name, event: session.event_title })}
            {session.venue && <span className="block text-cnx-muted">{session.venue}</span>}
          </p>
          {pos || venue ? (
            <MapView
              key={pos ? "live" : "venue"}
              center={pos ?? venue!}
              follow
              zoom={15}
              className="h-[60vh]"
              markers={[
                ...(venue ? [{ point: venue, color: "#a45032" }] : []),
                ...(pos ? [{ point: pos, color: "#285c48", label: session.display_name }] : []),
              ]}
            />
          ) : null}
          <p className="text-sm text-cnx-muted">
            {pos ? t("shareUpdated", { s: Math.max(0, Math.round((now - pos.t) / 1000)) }) : t("shareWaiting")}
          </p>
        </>
      )}
    </main>
  );
}

export default function ShareView({ token, lang, session }: { token: string; lang: Lang; session: Session | null }) {
  return (
    <LangProvider initial={lang} userId={null}>
      <Live token={token} session={session} />
    </LangProvider>
  );
}
