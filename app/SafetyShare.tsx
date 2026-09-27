"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import Icon from "./Icon";

type Session = { id: string; token: string; closes_at: string };

const HOUR = 3600_000;
const PING_MS = 15_000;

// Sharing is possible from 2 h before the event until 1 h after it ends (4 h assumed when there's no end time).
export function shareWindowOpen(startsAt: string, endsAt: string | null, now: number) {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 4 * HOUR;
  return now >= start - 2 * HOUR && now <= end + HOUR;
}

// Sends the user's own position to a friend over Realtime Broadcast. Positions are never stored.
export default function SafetyShare({ requestId }: { requestId: string }) {
  const t = useT();
  const [session, setSession] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!session) return;
    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`share:${session.token}`);
    let latest: GeolocationCoordinates | null = null;
    let wakeLock: WakeLockSentinel | null = null;

    const send = () => {
      if (!latest) return;
      channel.send({ type: "broadcast", event: "pos", payload: { lat: latest.latitude, lng: latest.longitude, t: Date.now() } });
      setLive(true);
    };
    const lock = async () => {
      if (document.visibilityState === "visible" && "wakeLock" in navigator)
        wakeLock = await navigator.wakeLock.request("screen").catch(() => null);
    };

    channel.subscribe();
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const first = !latest;
        latest = p.coords;
        if (first) send();
      },
      // Location lost or denied mid-share: end the session so the friend's page doesn't wait forever.
      () => {
        setError(t("locationOff"));
        fetch("/api/share/end", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: session.id }),
        }).finally(() => stopRef.current());
      },
      { enableHighAccuracy: true },
    );
    const timer = setInterval(send, PING_MS);
    const closeTimer = setTimeout(() => stopRef.current(), new Date(session.closes_at).getTime() - Date.now());
    lock();
    document.addEventListener("visibilitychange", lock);

    stopRef.current = () => {
      channel.send({ type: "broadcast", event: "ended", payload: {} });
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      clearTimeout(closeTimer);
      document.removeEventListener("visibilitychange", lock);
      wakeLock?.release();
      supabase.removeChannel(channel);
      setSession(null);
      setLive(false);
    };
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      clearTimeout(closeTimer);
      document.removeEventListener("visibilitychange", lock);
      wakeLock?.release();
      supabase.removeChannel(channel);
    };
  }, [session, t]);

  async function begin() {
    setError(null);
    // Check location access first, so a link is only created when there's something to share.
    const allowed = await new Promise<boolean>((resolve) => {
      if (!("geolocation" in navigator)) return resolve(false);
      navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { timeout: 15_000 });
    });
    if (!allowed) return setError(t("locationOff"));
    const res = await fetch("/api/share/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    }).catch(() => null);
    if (res?.ok) setSession(await res.json());
    else setError(t("somethingWrong"));
  }

  async function stop() {
    if (!session) return;
    await fetch("/api/share/end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: session.id }),
    });
    stopRef.current();
  }

  const link = session ? `${window.location.origin}/share/${session.token}` : "";

  return (
    <div className="space-y-2 text-sm">
      {!session ? (
        <button onClick={begin} className="cnx-btn-light w-full text-sm">
          <Icon name="locate" className="h-4 w-4" />
          {t("safetyShare")}
        </button>
      ) : (
        <>
          <p className={`font-semibold ${live ? "text-cnx-green" : "animate-pulse text-cnx-muted"}`}>● {live ? t("safetyLive") : t("shareWaiting")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true))}
              className="cnx-btn-light flex-1 text-xs"
            >
              {copied ? t("copied") : t("copyLink")}
            </button>
            <a href={`https://line.me/R/share?text=${encodeURIComponent(link)}`} target="_blank" className="cnx-btn-light flex-1 text-center text-xs">
              {t("shareLine")}
            </a>
          </div>
          <button onClick={stop} className="cnx-btn w-full py-4 text-base">
            {t("imSafe")}
          </button>
        </>
      )}
      {error && <p className="text-xs text-cnx-danger">{error}</p>}
    </div>
  );
}
