import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS. Only for server-owned writes (events, AI outputs, quotas).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Atomically take `n` from a counter keyed by `key` within the current `window` (Postgres interval).
export async function takeQuota(key: string, window: string, limit: number, n = 1): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("quota_take", {
    p_key: key,
    p_window: window,
    p_limit: limit,
    p_n: n,
  });
  return !error && data === true;
}
