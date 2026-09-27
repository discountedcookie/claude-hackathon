"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT, Lang } from "@/lib/i18n";
import { Rating } from "./MatchReview";
import type { Review } from "./MatchReview";
import { Clamp } from "./feed-types";
import { Faq } from "./ui";

type Profile = { id: string; display_name: string };
type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  looking_for: string | null;
  description_th: string | null;
  description_zh: string | null;
  title_th: string | null;
  title_zh: string | null;
  looking_for_th: string | null;
  looking_for_zh: string | null;
  category: "social" | "build" | "local_life";
  status: string;
  suggestions: { user_id: string; display_name: string; reason_en: string; reason_th: string; reason_zh: string }[] | null;
  profiles: { id: string; display_name: string } | null;
};
type JoinRequest = {
  id: string;
  project_id: string;
  requester_id: string;
  mission: string | null;
  status: "pending" | "accepted" | "declined";
  profiles: { id: string; display_name: string } | null;
};

function localized(p: Project, lang: Lang): string | null {
  if (lang === "th") return p.description_th ?? p.description;
  if (lang === "zh") return p.description_zh ?? p.description;
  return p.description;
}

export default function ProjectsBoard({ me }: { me: Profile }) {
  const supabase = createClient();
  const t = useT();
  const { lang } = useLang();
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [missionByProject, setMissionByProject] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("projects")
      .select("*, profiles:owner_id(id, display_name)")
      .order("created_at", { ascending: false });
    const projs = (p as unknown as Project[]) ?? [];
    setProjects(projs);

    const mine = projs.filter((x) => x.owner_id === me.id).map((x) => x.id);
    let reqQuery = supabase
      .from("project_requests")
      .select("*, profiles:requester_id(id, display_name)");
    reqQuery = mine.length
      ? reqQuery.or(`requester_id.eq.${me.id},project_id.in.(${mine.join(",")})`)
      : reqQuery.eq("requester_id", me.id);
    const { data: r } = await reqQuery;
    setRequests((r as unknown as JoinRequest[]) ?? []);

    // RLS only returns LINE ids of people you're connected to.
    const { data: c } = await supabase.from("contacts").select("user_id, line_id");
    setLines(Object.fromEntries((c ?? []).map((x) => [x.user_id, x.line_id])));

    const peerIds = [...new Set([
      ...projs.map((x) => x.owner_id),
      ...((r as unknown as JoinRequest[]) ?? []).map((x) => x.requester_id),
    ])];
    if (peerIds.length) {
      const { data: rv } = await supabase
        .from("reviews")
        .select("reviewee_id, stars")
        .in("reviewee_id", peerIds);
      const agg: Record<string, { sum: number; count: number }> = {};
      for (const row of (rv as Pick<Review, "reviewee_id" | "stars">[]) ?? []) {
        const a = (agg[row.reviewee_id] ??= { sum: 0, count: 0 });
        a.sum += row.stars;
        a.count += 1;
      }
      setRatings(
        Object.fromEntries(Object.entries(agg).map(([id, a]) => [id, { avg: a.sum / a.count, count: a.count }])),
      );
    }
  }, [supabase, me.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: setState happens after await
    load();
    const channel = supabase
      .channel("projects-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      setText("");
      setShowForm(false);
    } else {
      setFormError(res.status === 429 ? t("rateLimited") : res.status === 503 ? t("busy") : res.status === 400 ? t("projectTooShort") : t("somethingWrong"));
    }
    setBusy(false);
    load();
  }

  async function requestJoin(projectId: string) {
    await supabase
      .from("project_requests")
      .insert({ project_id: projectId, requester_id: me.id, mission: missionByProject[projectId] || null });
    load();
  }

  async function suggest(projectId: string) {
    setSuggesting(projectId);
    const res = await fetch("/api/projects/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (res.ok) {
      const { suggestions } = await res.json();
      setProjects((ps) => ps.map((p) => (p.id === projectId ? { ...p, suggestions } : p)));
    }
    setSuggesting(null);
  }

  async function setRequestStatus(id: string, status: "accepted" | "declined") {
    await supabase.from("project_requests").update({ status }).eq("id", id);
    load();
  }

  async function cancelRequest(id: string) {
    await supabase.from("project_requests").delete().eq("id", id);
    load();
  }

  async function closeProject(id: string) {
    await supabase.from("projects").update({ status: "closed" }).eq("id", id);
    load();
  }

  const open = projects.filter((p) => p.status === "open");
  const mine = projects.filter((p) => p.owner_id === me.id);
  const myAccepted = requests.filter((r) => r.requester_id === me.id && r.status === "accepted");
  const catLabel = { social: t("catSocial"), build: t("catBuild"), local_life: t("catLocalLife") } as const;

  function projectCard(p: Project) {
    const myReq = requests.find((r) => r.project_id === p.id && r.requester_id === me.id);
    const projectRequests = requests.filter((r) => r.project_id === p.id);
    const accepted = projectRequests.filter((r) => r.status === "accepted");
    const isOwner = p.owner_id === me.id;
    const description = localized(p, lang);
    const title = (lang !== "en" && p[`title_${lang}`]) || p.title;
    const lookingFor = (lang !== "en" && p[`looking_for_${lang}`]) || p.looking_for;
    return (
      <section key={p.id} className="cnx-card flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-cnx-muted">
              {catLabel[p.category]} · {p.profiles?.display_name}
              {p.profiles && <Rating avg={ratings[p.profiles.id]?.avg} count={ratings[p.profiles.id]?.count} />}
            </p>
            <h3 className="text-lg font-semibold leading-snug tracking-tight">{title}</h3>
          </div>
          {isOwner && p.status === "open" && (
            <button onClick={() => closeProject(p.id)} className="shrink-0 text-xs text-cnx-muted underline">
              {t("closeProject")}
            </button>
          )}
        </div>

        {description && <Clamp text={description} className="text-[15px] leading-relaxed" />}
        {lookingFor && <p className="text-sm text-cnx-muted">→ {lookingFor}</p>}

        {accepted.length > 0 && (isOwner || myReq?.status === "accepted") && (
          <p className="text-sm">
            <span className="font-semibold">{t("teamLine")}</span>{" "}
            {accepted.map((r) => `${r.profiles?.display_name} · LINE ${lines[r.requester_id] ?? t("noLine")}`).join(", ")}
          </p>
        )}

        {!isOwner && p.status === "open" &&
          (myReq ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="cnx-tag">{t(myReq.status)}</span>
              {myReq.status === "accepted" && (
                <span>
                  {p.profiles?.display_name} · LINE <b>{lines[p.owner_id] ?? t("noLine")}</b>
                </span>
              )}
              {myReq.status === "pending" && (
                <button onClick={() => cancelRequest(myReq.id)} className="text-xs text-cnx-muted underline">
                  {t("cancel")}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-auto flex gap-2">
              <input
                className="cnx-input text-sm"
                placeholder={t("requestMissionPh")}
                maxLength={300}
                value={missionByProject[p.id] ?? ""}
                onChange={(e) => setMissionByProject((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <button onClick={() => requestJoin(p.id)} className="cnx-btn shrink-0 text-sm">
                {t("requestJoin")}
              </button>
            </div>
          ))}

        {isOwner && projectRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cnx-muted">{t("requests")}</h4>
            <ul className="divide-y divide-cnx-line">
              {projectRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <b>{r.profiles?.display_name}</b>
                    <Rating avg={ratings[r.profiles?.id ?? ""]?.avg} count={ratings[r.profiles?.id ?? ""]?.count} />
                    {r.mission && <span className="font-reading block text-cnx-muted">“{r.mission}”</span>}
                  </span>
                  {r.status === "pending" ? (
                    <span className="flex shrink-0 gap-1">
                      <button onClick={() => setRequestStatus(r.id, "accepted")} className="cnx-btn px-3 py-1.5 text-xs">
                        {t("accept")}
                      </button>
                      <button onClick={() => setRequestStatus(r.id, "declined")} className="cnx-btn-light px-3 py-1.5 text-xs text-cnx-muted">
                        {t("decline")}
                      </button>
                    </span>
                  ) : (
                    <span className="cnx-tag shrink-0">{t(r.status)}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isOwner && p.status === "open" &&
          (p.suggestions ? (
            p.suggestions.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-cnx-muted">{t("suggested")}</h4>
                <ul className="space-y-1 text-sm">
                  {p.suggestions.map((s) => (
                    <li key={s.user_id}>
                      <b>{s.display_name}</b> <span className="text-cnx-muted">· {s[`reason_${lang}`] ?? s.reason_en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : (
            <button onClick={() => suggest(p.id)} disabled={suggesting === p.id} className="cnx-btn-light self-start text-sm">
              {suggesting === p.id ? "…" : t("suggestPeople")}
            </button>
          ))}
      </section>
    );
  }

  const others = open.filter((p) => p.owner_id !== me.id);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowForm((s) => !s)}
          className={`shrink-0 whitespace-nowrap text-sm ${showForm ? "cnx-btn-light text-cnx-muted" : "cnx-btn"}`}
        >
          {showForm ? t("cancel") : `+ ${t("newProject")}`}
        </button>
        <Faq prefix="faqPr" count={4} />
      </div>

      {showForm && (
        <form onSubmit={createProject} className="cnx-card space-y-2">
          <textarea
            className="cnx-input"
            rows={4}
            maxLength={2000}
            placeholder={t("describeProjectPh")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button disabled={busy || text.trim().length < 10} className="cnx-btn w-full sm:w-auto">
            {busy ? "…" : t("newProject")}
          </button>
          {formError && <p className="text-sm text-cnx-danger">{formError}</p>}
        </form>
      )}

      {myAccepted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("joinedProjects")}</h2>
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">{projects.filter((p) => myAccepted.some((r) => r.project_id === p.id)).map(projectCard)}</div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("myProjects")}</h2>
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">{mine.map(projectCard)}</div>
        </section>
      )}

      {projects.length === 0 && <p className="text-sm text-cnx-muted">{t("noProjects")}</p>}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t("tabProjects")}</h2>
          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">{others.map(projectCard)}</div>
        </section>
      )}
    </main>
  );
}
