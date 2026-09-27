import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:55321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) throw new Error("set SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Profiles and contacts are created by the on_auth_user_created trigger from user_metadata.
// Users still go through chat onboarding on first sign-in.
const users = [
  { email: "nomad@test.com", password: "demo1234", display_name: "Alex", line_id: "alex_line", language: "en" },
  { email: "local@test.com", password: "demo1234", display_name: "Mali", line_id: "mali_line", language: "th" },
  { email: "zh@test.com", password: "demo1234", display_name: "Wei", line_id: "wei_line", language: "zh" },
];

for (const { email, password, ...meta } of users) {
  const { error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (error && !/already/i.test(error.message)) throw error;
  console.log(`seeded ${email} (${meta.language})`);
}
