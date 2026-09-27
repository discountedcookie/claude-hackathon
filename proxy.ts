import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes an expiring Supabase session before pages and routes run, so Server Components
// (which can't write cookies) never see an expired token and bounce the user to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip static assets, images, icons and the public share page.
  matcher: ["/((?!_next/static|_next/image|share/|maplibre/|sw.js|manifest.webmanifest|icon|apple-icon|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
