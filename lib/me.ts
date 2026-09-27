import "server-only";
import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";

// Signed-in, onboarded profile for app pages; otherwise redirects to login or onboarding.
export async function requireProfile({ onboarded = true } = {}) {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) redirect("/login");
  if (onboarded && !profile.onboarded_at) redirect("/onboarding");
  return profile;
}
