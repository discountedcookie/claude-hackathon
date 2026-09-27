import { requireProfile } from "@/lib/me";
import AppFrame from "../AppFrame";
import EventsFeed from "../EventsFeed";
import Hero from "../Hero";

export default async function EventsPage() {
  const profile = await requireProfile();
  return (
    <AppFrame me={profile}>
      <Hero variant="events" />
      <EventsFeed meId={profile.id} />
    </AppFrame>
  );
}
