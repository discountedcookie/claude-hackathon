"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT, Lang } from "@/lib/i18n";
import { Rating } from "./MatchReview";
import type { Review } from "./MatchReview";

type Profile = { id: string; display_name: string; line_id: string | null; role: string };
type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  looking_for: string | null;
  description_th: string | null;
  description_zh: string | null;
  category: "social" | "build" | "local_life";
  status: string;
  profiles: { id: string; display_name: string; line_id: string | null } | null;
};
type JoinRequest = {
  id: string;
  project_id: string;
  requester_id: string;
  mission: string | null;
  status: "pending" | "accepted" | "declined";
  profiles: { id: string; display_name: string; line_id: string | null } | null;
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
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [category, setCategory] = useState<"social" | "build" | "local_life">("build");
  const [missionByProject, setMissionByProject] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("projects")
      .select("*, profiles:owner_id(id, display_name, line_id)")
      .order("created_at", { ascending: false });
    const projs = (p as unknown as Project[]) ?? [];
    setProjects(projs);

    const mine = projs.filter((x) => x.owner_id === me.id).map((x) => x.id);
    let reqQuery = supabase
      .from("project_requests")
      .select("*, profiles:requester_id(id, display_name, line_id)");
    reqQuery = mine.length
      ? reqQuery.or(`requester_id.eq.${me.id},project_id.in.(${mine.join(",")})`)
      : reqQuery.eq("requester_id", me.id);
    const { data: r } = await reqQuery;
    setRequests((r as unknown as JoinRequest[]) ?? []);

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
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description: desc, looking_for: lookingFor, category }),
    });
    if (res.ok) {
      setTitle("");
      setDesc("");
      setLookingFor("");
      setShowForm(false);
    }
    setBusy(false);
    load();
  }

  async function requestJoin(projectId: string) {
    await supabase.from("project_requests").upsert(
      { project_id: projectId, requester_id: me.id, mission: missionByProject[projectId] || null, status: "pending" },
      { onConflict: "project_id,requester_id" },
    );
    load();
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
    const accepted = requests.filter((r) => r.project_id === p.id && r.status === "accepted");
    const isOwner = p.owner_id === me.id;
    return (
      <section key={p.id} className="rounded-[22px] border border-cnx-line bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-xs text-cnx-muted">
              {catLabel[p.category]} · {t("yourHost")}: <b>{p.profiles?.display_name}</b>
              {p.profiles && <Rating avg={ratings[p.profiles.id]?.avg} count={ratings[p.profiles.id]?.count} />}
            </p>
          </div>
          {isOwner && p.status === "open" && (
            <button onClick={() => closeProject(p.id)} className="shrink-0 rounded-lg border border-cnx-line px-2 py-1 text-xs text-cnx-muted">
              {t("closeProject")}
            </button>
          )}
        </div>
        {localized(p, lang) && <p className="mt-2 whitespace-pre-line rounded-xl bg-cnx-pale p-3 text-sm">{localized(p, lang)}</p>}
        {p.looking_for && <p className="mt-2 text-sm italic text-cnx-muted">{p.looking_for}</p>}

        {accepted.length > 0 && (isOwner || myReq?.status === "accepted") && (
          <p className="mt-2 rounded-xl bg-cnx-lime/50 p-2 text-xs">
            {t("teamLine")}: {accepted.map((r) => `${r.profiles?.display_name} (${r.profiles?.line_id ?? "n/a"})`).join(", ")}
          </p>
        )}

        {!isOwner && p.status === "open" && (
          <div className="mt-3 space-y-2">
            {myReq ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-cnx-muted">
                  {t("requested")} — {myReq.status}
                  {myReq.status === "accepted" && (
                    <span className="block text-cnx-ink">
                      {t("yourHost")} LINE: <b>{p.profiles?.line_id ?? "n/a"}</b>
                    </span>
                  )}
                </span>
                {myReq.status === "pending" && (
                  <button onClick={() => cancelRequest(myReq.id)} className="rounded-lg border border-cnx-line px-2 py-1 text-xs">
                    {t("cancel")}
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  className="w-full rounded-xl border border-cnx-line p-2 text-sm"
                  placeholder={t("requestMissionPh")}
                  value={missionByProject[p.id] ?? ""}
                  onChange={(e) => setMissionByProject((s) => ({ ...s, [p.id]: e.target.value }))}
                />
                <button
                  onClick={() => requestJoin(p.id)}
                  className="w-full rounded-xl bg-cnx-green p-2 text-sm font-semibold text-white"
                >
                  {t("requestJoin")}
                </button>
              </>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-3 space-y-2">
            <h4 className="text-xs font-semibold text-cnx-muted">{t("requests")} ({requests.filter((r) => r.project_id === p.id).length})</h4>
            {requests
              .filter((r) => r.project_id === p.id)
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-cnx-line p-2 text-sm">
                  <span>
                    <b>{r.profiles?.display_name}</b>
                    <Rating avg={ratings[r.profiles?.id ?? ""]?.avg} count={ratings[r.profiles?.id ?? ""]?.count} />
                    {r.mission && <span className="block italic text-cnx-muted">{r.mission}</span>}
                    {r.status !== "pending" && <span className="block text-xs text-cnx-muted">{r.status}</span>}
                  </span>
                  {r.status === "pending" && (
                    <span className="flex shrink-0 gap-1">
                      <button onClick={() => setRequestStatus(r.id, "accepted")} className="rounded-lg bg-cnx-green px-2 py-1 text-xs text-white">
                        {t("accept")}
                      </button>
                      <button onClick={() => setRequestStatus(r.id, "declined")} className="rounded-lg bg-cnx-danger-bg border border-cnx-danger-line px-2 py-1 text-xs text-cnx-danger">
                        {t("decline")}
                      </button>
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t("projectsTitle")}</h1>
          <p className="text-sm text-cnx-muted">{t("projectsHint")}</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-xl bg-cnx-green px-4 py-2 text-sm font-semibold text-white">
          + {t("newProject")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="mb-6 space-y-2 rounded-[22px] border border-cnx-line bg-white p-5 shadow-sm">
          <input className="w-full rounded-xl border border-cnx-line p-2" placeholder={t("projectTitlePh")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="w-full rounded-xl border border-cnx-line p-2" rows={2} placeholder={t("projectDescPh")} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className="w-full rounded-xl border border-cnx-line p-2" placeholder={t("lookingForPh")} value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} />
          <div className="flex gap-2">
            {(["social", "build", "local_life"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex-1 rounded-xl border p-2 text-sm ${category === c ? "bg-cnx-green text-white border-cnx-green" : "border-cnx-line text-cnx-muted"}`}
              >
                {catLabel[c]}
              </button>
            ))}
          </div>
          <button disabled={busy} className="w-full rounded-xl bg-cnx-green p-2 font-semibold text-white disabled:opacity-50">
            {busy ? "…" : t("newProject")}
          </button>
        </form>
      )}

      {myAccepted.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">{t("joinedProjects")}</h2>
          <div className="space-y-4">{projects.filter((p) => myAccepted.some((r) => r.project_id === p.id)).map(projectCard)}</div>
        </>
      )}

      {mine.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">{t("myProjects")}</h2>
          <div className="space-y-4">{mine.map(projectCard)}</div>
        </>
      )}

      <h2 className="mb-2 mt-6 font-semibold">{t("tabProjects")}</h2>
      <div className="space-y-4">{open.filter((p) => p.owner_id !== me.id).map(projectCard)}</div>
    </main>
  );
}
