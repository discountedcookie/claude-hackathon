"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

export type Review = {
  id: string;
  buddy_request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  stars: number;
  text: string | null;
  auto_no_show: boolean;
};

export function Stars({ n }: { n: number }) {
  return <span className="text-amber-500">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

export function Rating({ avg, count }: { avg?: number; count?: number }) {
  if (!count || avg === undefined) return null;
  return (
    <span className="ml-1 text-xs font-normal text-cnx-muted">
      {avg.toFixed(1)}★ ({count})
    </span>
  );
}

// Required after the event: stars plus a few words, or a one-tap no-show.
export default function MatchReview({
  requestId,
  meId,
  other,
  onDone,
}: {
  requestId: string;
  meId: string;
  other: { id: string; display_name: string };
  onDone: () => void;
}) {
  const supabase = createClient();
  const t = useT();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(s: number, noShow: boolean) {
    setBusy(true);
    await supabase.from("reviews").insert({
      buddy_request_id: requestId,
      reviewer_id: meId,
      reviewee_id: other.id,
      stars: s,
      text: noShow ? null : text.trim(),
      auto_no_show: noShow,
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t("secRate", { name: other.display_name })}</p>
        <button disabled={busy} onClick={() => submit(1, true)} className="text-xs text-cnx-danger underline">
          {t("noShowBtn")}
        </button>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            aria-label={`${n}★`}
            className={`text-3xl leading-none ${stars >= n ? "text-amber-500" : "text-cnx-line"}`}
          >
            ★
          </button>
        ))}
      </div>
      {stars > 0 && (
        <div className="flex gap-2">
          <input
            className="cnx-input text-sm"
            placeholder={t("howWas")}
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <button disabled={busy || text.trim().length < 2} onClick={() => submit(stars, false)} className="cnx-btn shrink-0 text-sm">
            {t("leaveReview")}
          </button>
        </div>
      )}
    </div>
  );
}
