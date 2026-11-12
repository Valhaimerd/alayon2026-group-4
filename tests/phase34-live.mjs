// Opt-in: uses a real test project and authorized staff credentials supplied through the environment.
// Test bookings are restricted to generated IDs/titles and removed in finally; no SMS contacts are created.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

assert.equal(
  process.env.RUN_LIVE_ACCESS_TESTS,
  "true",
  "Explicitly enable live tests",
);
process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(
  url && key && process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASSWORD,
  "Provide Supabase and test account configuration",
);
const staff = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ids = [randomUUID(), randomUUID()];
try {
  const login = await staff.auth.signInWithPassword({
    email: process.env.E2E_STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD,
  });
  assert.equal(login.error, null, "Staff sign-in must succeed");
  const refresh = await staff.auth.refreshSession();
  assert.equal(refresh.error, null, "Session refresh must succeed");
  const role = await staff
    .from("account_roles")
    .select("user_id")
    .eq("user_id", login.data.user.id)
    .eq("role", "registrar")
    .single();
  assert.equal(
    role.error,
    null,
    "Authenticated account must have staff membership",
  );
  const privateRead = await anon.from("instructors").select("id");
  assert.ok(
    privateRead.error,
    "Anonymous access to private contacts must fail",
  );
  const publicWrite = await anon
    .from("rooms")
    .insert({
      id: "forbidden-" + randomUUID(),
      name: "TEST forbidden",
      floor: 0,
      capacity: 20,
    });
  assert.ok(publicWrite.error, "Anonymous room writes must fail");
  const input = {
    kind: "activity",
    room_id: "g3",
    instructor_name: "TEST",
    starts_at: "2030-01-09T12:00:00+08:00",
    ends_at: "2030-01-09T13:00:00+08:00",
    class_size: 20,
    published: true,
  };
  const results = await Promise.all(
    ids.map((id) =>
      staff
        .from("bookings")
        .insert({ ...input, id, title: "E2E Phase4 Concurrent " + id })
        .select("id")
        .single(),
    ),
  );
  assert.equal(
    results.filter((r) => !r.error).length,
    1,
    "Exactly one concurrent booking must succeed",
  );
  assert.equal(
    results.filter((r) => r.error?.code === "23P01").length,
    1,
    "The other booking must be rejected as an overlap",
  );
  console.log(
    "PASS: staff login, session refresh, role lookup, anonymous access checks, concurrent conflict protection",
  );
} finally {
  const cleanup = await staff
    .from("bookings")
    .delete()
    .in("id", ids)
    .like("title", "E2E Phase4 Concurrent %");
  assert.equal(cleanup.error, null, "Test booking cleanup must succeed");
  await staff.auth.signOut({ scope: "local" });
}
