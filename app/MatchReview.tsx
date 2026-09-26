"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

export type Review = {
  id: string;
  match_id: string;
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
    <span className="ml-1 text-xs text-cnx-muted">
      {avg.toFixed(1)}★ ({count})
    </span>
  );
}

export default function MatchReview({
  matchId,
  meId,
  other,
  eventStarted,
  myReview,
  theirReview,
  onDone,
}: {
  matchId: string;
  meId: string;
  other: { id: string; display_name: string };
  eventStarted: boolean;
  myReview: Review | null;
  theirReview: Review | null;
  onDone: () => void;
}) {
  const supabase = createClient();
  const t = useT();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(s: number, auto: boolean) {
    if (!s) return;
    setBusy(true);
    await supabase.from("reviews").insert({
      match_id: matchId,
      reviewer_id: meId,
      reviewee_id: other.id,
      stars: s,
      text: auto ? null : text || null,
      auto_no_show: auto,
    });
    setBusy(false);
    onDone();
  }

  if (!eventStarted)
    return <p className="text-xs text-cnx-muted">{t("reviewsLocked")}</p>;

  if (myReview)
    return (
      <div className="text-xs text-cnx-muted">
        <p>
          {t("youGave")}: <Stars n={myReview.stars} />
          {myReview.auto_no_show && ` ${t("noShowMark")}`}
          {myReview.text && ` — “${myReview.text}”`}
        </p>
        {theirReview ? (
          <p>
            {other.display_name} {t("gaveYou")}: <Stars n={theirReview.stars} />
            {theirReview.auto_no_show && ` ${t("noShowMark")}`}
            {theirReview.text && ` — “${theirReview.text}”`}
          </p>
        ) : (
          <p className="text-cnx-muted/70">{other.display_name} {t("hasntReviewed")}</p>
        )}
      </div>
    );

  return (
    <div className="mt-1 space-y-1 text-sm">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-lg ${stars >= n ? "text-amber-500" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="cnx-input text-xs"
        rows={2}
        placeholder={`${t("howWas")} ${other.display_name}? (optional)`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          disabled={busy || !stars}
          onClick={() => submit(stars, false)}
          className="cnx-btn px-2 py-1 text-xs"
        >
          {t("leaveReview")}
        </button>
        <button
          disabled={busy}
          onClick={() => submit(1, true)}
          className="cnx-btn-danger"
        >
          {t("noShowBtn")}
        </button>
      </div>
    </div>
  );
}
