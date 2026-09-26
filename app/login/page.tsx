"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [lineId, setLineId] = useState("");
  const [role, setRole] = useState<"foreigner" | "local">("local");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          display_name: displayName || email,
          line_id: lineId || null,
          role,
        });
      }
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Plus One · Chiang Mai</h1>
      <p className="text-sm text-gray-500">
        {mode === "signin" ? "Sign in" : "Create account"} — {mode === "signin" ? (
          <button className="underline" onClick={() => setMode("signup")}>need an account?</button>
        ) : (
          <button className="underline" onClick={() => setMode("signin")}>have one already?</button>
        )}
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input className="rounded border p-2" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="rounded border p-2" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === "signup" && (
          <>
            <input className="rounded border p-2" placeholder="display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <input className="rounded border p-2" placeholder="LINE id (how your match contacts you)" value={lineId} onChange={(e) => setLineId(e.target.value)} />
            <div className="flex gap-2">
              {(["local", "foreigner"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded border p-2 ${role === r ? "bg-black text-white" : ""}`}
                >
                  I&apos;m a {r}
                </button>
              ))}
            </div>
          </>
        )}
        <button disabled={busy} className="rounded bg-black p-2 text-white disabled:opacity-50">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
