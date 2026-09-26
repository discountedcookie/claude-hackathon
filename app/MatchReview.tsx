"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    <span className="ml-1 text-xs text-gray-500">
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
    return <p className="text-xs text-gray-400">Reviews unlock once the event starts.</p>;

  if (myReview)
    return (
      <div className="text-xs text-gray-600">
        <p>
          You gave: <Stars n={myReview.stars} />
          {myReview.auto_no_show && " (marked as no-show)"}
          {myReview.text && ` — “${myReview.text}”`}
        </p>
        {theirReview ? (
          <p>
            {other.display_name} gave you: <Stars n={theirReview.stars} />
            {theirReview.auto_no_show && " (marked as no-show)"}
            {theirReview.text && ` — “${theirReview.text}”`}
          </p>
        ) : (
          <p className="text-gray-400">{other.display_name} hasn&apos;t reviewed yet.</p>
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
        className="w-full rounded border p-1 text-xs"
        rows={2}
        placeholder={`How was ${other.display_name}? (optional)`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          disabled={busy || !stars}
          onClick={() => submit(stars, false)}
          className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          Leave review
        </button>
        <button
          disabled={busy}
          onClick={() => submit(1, true)}
          className="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
        >
          They didn&apos;t show up
        </button>
      </div>
    </div>
  );
}
