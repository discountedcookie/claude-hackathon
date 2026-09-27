import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Lang } from "@/lib/i18n";
import ShareView from "./ShareView";

function preferredLang(acceptLanguage: string | null): Lang {
  const first = (acceptLanguage ?? "").toLowerCase();
  if (first.startsWith("th")) return "th";
  if (first.startsWith("zh")) return "zh";
  return "en";
}

// Public read-only view for a friend. The token is checked by a security-definer function.
export default async function SharePage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_share_session", { p_token: token });
  const session = (data as { display_name: string; event_title: string; venue: string | null; lat: number | null; lng: number | null; closes_at: string; active: boolean }[] | null)?.[0];

  return (
    <ShareView
      token={token}
      lang={preferredLang((await headers()).get("accept-language"))}
      session={session?.active ? session : null}
    />
  );
}
