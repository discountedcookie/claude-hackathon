import { requireProfile } from "@/lib/me";
import AppFrame from "../AppFrame";
import Hero from "../Hero";
import ProjectsBoard from "../ProjectsBoard";

export default async function ProjectsPage() {
  const profile = await requireProfile();
  return (
    <AppFrame me={profile}>
      <Hero variant="projects" />
      <ProjectsBoard me={profile} />
    </AppFrame>
  );
}
