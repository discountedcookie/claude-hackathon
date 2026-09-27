"use client";

import Spinner from "./Spinner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

// Name and LINE ID, the two things people need to change after onboarding.
export default function EditProfile({
  me,
  open,
  onOpenChange,
}: {
  me: { id: string; display_name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState(me.display_name);
  const [line, setLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function load(isOpen: boolean) {
    onOpenChange(isOpen);
    if (!isOpen || line !== null) return;
    const { data } = await createClient().from("contacts").select("line_id").eq("user_id", me.id).maybeSingle();
    setLine(data?.line_id ?? "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const supabase = createClient();
    const [{ error: nameError }, { error: lineError }] = await Promise.all([
      supabase.from("profiles").update({ display_name: name.trim() }).eq("id", me.id),
      supabase.from("contacts").upsert({ user_id: me.id, line_id: (line ?? "").trim() }),
    ]);
    setBusy(false);
    if (nameError || lineError) return setError(true);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={load}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-cnx-ink/30" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl bg-white p-6 shadow-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[24rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <Dialog.Title className="mb-4 text-lg font-bold">{t("editProfile")}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("editProfile")}</Dialog.Description>
          <form onSubmit={save} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-cnx-muted">{t("onbName")}</span>
              <input className="cnx-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-cnx-muted">{t("onbLine")}</span>
              <input className="cnx-input" value={line ?? ""} onChange={(e) => setLine(e.target.value)} maxLength={60} required />
              <span className="text-xs text-cnx-muted">{t("onbLineHint")}</span>
            </label>
            {error && <p className="text-sm text-cnx-danger">{t("somethingWrong")}</p>}
            <div className="flex gap-2">
              <Dialog.Close className="cnx-btn-light flex-1">{t("cancel")}</Dialog.Close>
              <button disabled={busy || line === null} className="cnx-btn flex-1">
                {busy ? <Spinner /> : t("save")}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
