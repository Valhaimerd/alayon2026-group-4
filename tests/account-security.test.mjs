import { test } from "node:test";
import assert from "node:assert/strict";
import { requiresMfa, passwordError } from "../lib/account-security.ts";

test("optional enrollment requires MFA only after a factor is verified", () => {
  assert.equal(requiresMfa(undefined, "aal1"), false);
  assert.equal(requiresMfa([{ status: "unverified" }], "aal1"), false);
  assert.equal(requiresMfa([{ status: "verified" }], "aal1"), true);
  assert.equal(requiresMfa([{ status: "verified" }], null), true);
  assert.equal(requiresMfa([{ status: "verified" }], "aal2"), false);
});

test("password changes reject short or mismatching passwords", () => {
  assert.ok(passwordError("short", "short"));
  assert.ok(passwordError("long-enough", "different"));
  assert.ok(passwordError("x".repeat(129), "x".repeat(129)));
  assert.equal(passwordError("long-enough", "long-enough"), null);
});
