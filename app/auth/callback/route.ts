import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email-confirmation link lands here (PKCE code) and signs the user in.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) await (await createClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/onboarding", url.origin));
}
