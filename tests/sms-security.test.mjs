import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizePhone,smsCodeHash} from "../lib/sms-security.ts";

test("mobile numbers normalize Philippine forms and reject malformed input",()=>{
  assert.equal(normalizePhone("09934593138"),"+639934593138");
  assert.equal(normalizePhone("+63 993 459 3138"),"+639934593138");
  assert.equal(normalizePhone("639934593138"),"+639934593138");
  for(const phone of ["abc","+0123456789","+6312","+639934593138junk"]) assert.equal(normalizePhone(phone),null);
});

test("verification hashes bind code, user and challenge to the server secret",()=>{
  const hash=smsCodeHash("secret","user","challenge","123456");
  assert.match(hash,/^[a-f0-9]{64}$/);
  for(const args of [["other","user","challenge","123456"],["secret","other","challenge","123456"],["secret","user","other","123456"],["secret","user","challenge","654321"]]) assert.notEqual(smsCodeHash(...args),hash);
});
