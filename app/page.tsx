import { redirect } from "next/navigation";
import { createClient, getUserId } from "@/lib/supabase/server";
import Landing from "./Landing";

// Public landing page; signed-in users go straight to their events.
export default async function Home() {
  const userId = await getUserId(await createClient());
  if (userId) redirect("/events");
  return <Landing />;
}
