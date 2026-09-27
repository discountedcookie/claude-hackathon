"use client";

import Spinner, { AiWorking } from "./Spinner";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n";
import Icon from "./Icon";
import MatchReview, { Rating, Review, Stars } from "./MatchReview";
import SafetyShare, { shareWindowOpen } from "./SafetyShare";
import { Avatar, EventHeading, LanguageChips, type BuddyRequest, type FeedEvent, type Person } from "./feed-types";
import Written from "./Written";

type FollowUp = { message_in_their_language: string; message_in_my_language: string };

// What shows depends on where we are. Contact, meeting point and openers stay until the event is over;
// location sharing during its window; after it starts, the review, then the follow-up message.
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
  const [draft, setDraft] = useState<FollowUp | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [introState, setIntroState] = useState<"idle" | "loading" | "failed">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const stored = req.icebreakers?.[meId];
  const intro = stored?.[lang] ?? stored?.en ?? stored;
  const meet = intro?.meet ?? intro?.meet_suggestion;
  const openers = intro?.openers ?? intro?.icebreakers ?? [];
  const introCurrent = !!stored?.en && !!stored?.th && !!stored?.zh;
  const start = ev.starts_at ? new Date(ev.starts_at).getTime() : null;
  const end = start === null ? null : ev.ends_at ? new Date(ev.ends_at).getTime() : start + 4 * 3600_000;
  const started = start !== null && start < now;
  const over = end !== null && end < now;
  const canShare = !!ev.starts_at && shareWindowOpen(ev.starts_at, ev.ends_at, now);
  const myReview = reviews.find((r) => r.buddy_request_id === req.id && r.reviewer_id === meId);
  const theirReview = reviews.find((r) => r.buddy_request_id === req.id && r.reviewer_id === other.id);
  const lineUrl = line ? `https://line.me/ti/p/~${encodeURIComponent(line)}` : null;
  const followUp = draft ?? req.followups?.[meId] ?? null;

  // Intros that are missing (AI failed at accept time) or single-language (older rows) are filled in once.
  const asked = useRef(false);
  useEffect(() => {
    if (introCurrent || over || asked.current) return;
    asked.current = true;
    setIntroState("loading");
    fetch("/api/buddy/intro", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: req.id }),
    })
      .then((r) => {
        setIntroState(r.ok ? "idle" : "failed");
        if (r.ok) onChange();
      })
      .catch(() => setIntroState("failed"));
  }, [introCurrent, over, req.id, onChange]);

  async function cancel() {
    if (!window.confirm(t("confirmCancelPlan", { name: other.display_name }))) return;
    const { error } = await supabase.from("buddy_requests").delete().eq("id", req.id);
    if (error) return setNotice(t("somethingWrong"));
    onChange();
  }

  async function draftFollowUp() {
    setNotice(null);
    setDrafting(true);
    const res = await fetch("/api/buddy/follow-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request_id: req.id }),
    }).catch(() => null);
    setDrafting(false);
    if (res?.ok) setDraft(await res.json());
    else setNotice(res?.status === 429 ? t("rateLimited") : res?.status === 503 ? t("busy") : t("somethingWrong"));
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
          {other.bio && <Written kind="bio" id={other.id} text={other.bio} className="mt-1 block text-sm text-cnx-muted" />}
        </div>
      </div>

      {!over && (
        <dl className="space-y-2 text-sm">
          {introState === "loading" && !meet ? (
            <AiWorking label={t("introLoading")} />
          ) : (
            <>
              <div className="flex gap-2">
                <dt className="shrink-0 font-semibold text-cnx-muted">{t("meetLabel")}</dt>
                <dd>{meet || t("introFallback")}</dd>
              </div>
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
            </>
          )}
        </dl>
      )}

      <div className="flex gap-2">
        {lineUrl && (
          <a href={lineUrl} target="_blank" className="cnx-btn min-w-0 flex-1 truncate text-sm">
            LINE · {line}
          </a>
        )}
        {!started && (
          <a href={ev.luma_url} target="_blank" className="cnx-btn-light shrink-0 text-sm">
            {t("registerOnLuma")}
            <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>

      {canShare && <SafetyShare requestId={req.id} />}

      {started && !myReview && (
        <MatchReview
          requestId={req.id}
          meId={meId}
          other={{ id: other.id, display_name: other.display_name }}
          onDone={() => {
            onChange();
            if (!followUp) draftFollowUp();
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
              <p className="whitespace-pre-line rounded-xl bg-cnx-pale p-3 text-sm">{followUp.message_in_their_language}</p>
              {followUp.message_in_my_language && (
                <p className="whitespace-pre-line text-xs text-cnx-muted">{followUp.message_in_my_language}</p>
              )}
              <div className="flex flex-wrap gap-2">
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
                <button onClick={draftFollowUp} disabled={drafting} className="cnx-btn-light text-sm">
                  {drafting ? <Spinner /> : t("redraft")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={draftFollowUp} disabled={drafting} className="cnx-btn-light w-full text-sm">
              {drafting ? <AiWorking label={t("writingMessage")} /> : t("draftFollowUp")}
            </button>
          )}
        </div>
      )}

      {notice && <p className="text-xs text-cnx-danger">{notice}</p>}

      {!started && (
        <button onClick={cancel} className="mt-auto self-start text-xs text-cnx-muted underline">
          {t("cancelBuddy")}
        </button>
      )}
    </li>
  );
}
