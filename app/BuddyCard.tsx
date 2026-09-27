"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n";
import Icon from "./Icon";
import MatchReview, { Rating, Review, Stars } from "./MatchReview";
import SafetyShare, { shareWindowOpen } from "./SafetyShare";
import { Avatar, EventHeading, LanguageChips, type BuddyRequest, type FeedEvent, type Person } from "./feed-types";

type FollowUp = { message_in_their_language: string; message_in_my_language: string };

// What shows depends on where we are: before the event, during it (location sharing), after it (review, then message).
export default function BuddyCard({
  req,
  ev,
  other,
  line,
  meId,
  rating,
  reviews,
  onChange,
}: {
  req: BuddyRequest;
  ev: FeedEvent;
  other: Person;
  line: string | null;
  meId: string;
  rating?: { avg: number; count: number };
  reviews: Review[];
  onChange: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const supabase = createClient();
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const stored = req.icebreakers?.[meId];
  const intro = stored?.[lang] ?? stored?.en ?? stored;
  const meet = intro?.meet ?? intro?.meet_suggestion;
  const openers = intro?.openers ?? intro?.icebreakers ?? [];
  const started = !!ev.starts_at && new Date(ev.starts_at).getTime() < now;
  const canShare = !!ev.starts_at && shareWindowOpen(ev.starts_at, ev.ends_at, now);
  const myReview = reviews.find((r) => r.buddy_request_id === req.id && r.reviewer_id === meId);
  const theirReview = reviews.find((r) => r.buddy_request_id === req.id && r.reviewer_id === other.id);
  const lineUrl = line ? `https://line.me/ti/p/~${encodeURIComponent(line)}` : null;

  async function cancel() {
    await supabase.from("buddy_requests").delete().eq("id", req.id);
    onChange();
  }

  async function draftFollowUp() {
    setNotice(null);
    setDrafting(true);
    const res = await fetch("/api/buddy/follow-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: req.id }),
    });
    setDrafting(false);
    if (res.ok) setFollowUp(await res.json());
    else setNotice(res.status === 429 ? t("rateLimited") : res.status === 503 ? t("busy") : t("somethingWrong"));
  }

  return (
    <li className="cnx-card flex flex-col gap-4">
      <EventHeading ev={ev} />

      <div className="flex items-center gap-3">
        <Avatar name={other.display_name} />
        <div className="min-w-0">
          <p className="font-semibold">
            {other.display_name}
            <Rating avg={rating?.avg} count={rating?.count} />
          </p>
          <LanguageChips languages={other.languages} />
        </div>
      </div>

      {!started && (meet || openers.length > 0) && (
        <dl className="font-reading space-y-2 text-sm">
          {meet && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-cnx-muted">{t("meetLabel")}</dt>
              <dd>{meet}</dd>
            </div>
          )}
          {openers.length > 0 && (
            <div className="flex gap-2">
              <dt className="shrink-0 font-semibold text-cnx-muted">{t("openersLabel")}</dt>
              <dd>
                <ul className="space-y-1">
                  {openers.map((q) => (
                    <li key={q}>“{q}”</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}

      {started && !myReview && (
        <MatchReview
          requestId={req.id}
          meId={meId}
          other={{ id: other.id, display_name: other.display_name }}
          onDone={() => {
            onChange();
            draftFollowUp();
          }}
        />
      )}

      {started && myReview && (
        <div className="space-y-3">
          <p className="text-xs text-cnx-muted">
            {t("youGave")} <Stars n={myReview.stars} />
            {theirReview && (
              <>
                {" · "}
                {other.display_name} <Stars n={theirReview.stars} />
              </>
            )}
          </p>
          <p className="text-sm font-semibold">{t("secFollow", { name: other.display_name })}</p>
          {followUp ? (
            <div className="space-y-2">
              <p className="font-reading whitespace-pre-line rounded-xl bg-cnx-pale p-3 text-sm">{followUp.message_in_their_language}</p>
              {followUp.message_in_my_language && (
                <p className="font-reading whitespace-pre-line text-xs text-cnx-muted">{followUp.message_in_my_language}</p>
              )}
              <div className="flex gap-2">
                <a
                  href={`https://line.me/R/share?text=${encodeURIComponent(followUp.message_in_their_language)}`}
                  target="_blank"
                  className="cnx-btn flex-1 text-sm"
                >
                  <Icon name="send" className="h-4 w-4" />
                  {t("sendLine")}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(followUp.message_in_their_language).then(() => setCopied(true))}
                  className="cnx-btn-light text-sm"
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={draftFollowUp} disabled={drafting} className="cnx-btn-light w-full text-sm">
              {drafting ? "…" : t("draftFollowUp")}
            </button>
          )}
          {notice && <p className="text-xs text-cnx-danger">{notice}</p>}
        </div>
      )}

      {!started && (
        <div className="flex gap-2">
          {lineUrl && (
            <a href={lineUrl} target="_blank" className="cnx-btn min-w-0 flex-1 truncate text-sm">
              LINE · {line}
            </a>
          )}
          <a href={ev.luma_url} target="_blank" className="cnx-btn-light shrink-0 text-sm">
            {t("registerOnLuma")}
            <Icon name="external" className="h-4 w-4" />
          </a>
        </div>
      )}

      {canShare && <SafetyShare requestId={req.id} />}

      {!started && (
        <button onClick={cancel} className="mt-auto self-start text-xs text-cnx-muted underline">
          {t("cancelBuddy")}
        </button>
      )}
    </li>
  );
}
