import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppFrame from "../AppFrame";
import Hero from "../Hero";
import ForeignerDashboard from "../ForeignerDashboard";
import LocalDashboard from "../LocalDashboard";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return (
    <AppFrame me={profile}>
      <Hero variant="events" />
      {profile.role === "foreigner" ? (
        <ForeignerDashboard me={profile} />
      ) : (
        <LocalDashboard me={profile} />
      )}
    </AppFrame>
  );
}
