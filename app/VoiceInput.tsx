"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT, type Lang } from "@/lib/i18n";
import Icon from "./Icon";

const SPEECH_LANG: Record<Lang, string> = { en: "en-US", th: "th-TH", zh: "zh-CN" };

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

// Dictation with the browser's own speech recognition (Chrome, Safari); hidden where it isn't available.
export default function VoiceInput({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setSupported(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  function toggle() {
    if (listening) return rec.current?.stop();
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[lang];
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => onText(Array.from(e.results, (res) => res[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={t("voice")}
      aria-pressed={listening}
      className={`shrink-0 ${listening ? "cnx-btn animate-pulse" : "cnx-btn-light"}`}
    >
      <Icon name="mic" className="h-5 w-5" />
    </button>
  );
}
