import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppFrame from "../AppFrame";
import Hero from "../Hero";
import ProjectsBoard from "../ProjectsBoard";

export default async function ProjectsPage() {
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
      <Hero variant="projects" />
      <ProjectsBoard me={profile} />
    </AppFrame>
  );
}
