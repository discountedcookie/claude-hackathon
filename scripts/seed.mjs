import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:55321";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) throw new Error("set SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: "nomad@test.com", password: "demo1234", name: "Alex (nomad)", role: "foreigner", line: "alex_line" },
  { email: "local@test.com", password: "demo1234", name: "Mali (local)", role: "local", line: "mali_line" },
];

for (const u of users) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  });
  if (error && !/already/i.test(error.message)) throw error;
  const id = created?.user?.id ?? (await supabase.auth.admin.listUsers()).data.users.find((x) => x.email === u.email)?.id;
  await supabase.from("profiles").upsert({ id, display_name: u.name, line_id: u.line, role: u.role });
  console.log(`seeded ${u.email} (${u.role})`);
}
