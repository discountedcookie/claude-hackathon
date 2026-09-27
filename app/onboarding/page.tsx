import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/me";
import { createClient } from "@/lib/supabase/server";
import OnboardingChat from "./OnboardingChat";

export default async function OnboardingPage() {
  const profile = await requireProfile({ onboarded: false });
  if (profile.onboarded_at) redirect("/events");

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("transcript, turns")
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <OnboardingChat
      me={{ id: profile.id, language: profile.language }}
      transcript={session?.transcript ?? []}
      turns={session?.turns ?? 0}
    />
  );
}
