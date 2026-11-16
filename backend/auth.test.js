import test from "node:test";
import assert from "node:assert/strict";
import { createToken, hashPassword, verifyPassword, verifyToken } from "./auth.js";

test("passwords are hashed and only the original password verifies", async () => {
  const hash = await hashPassword("clave-de-prueba-larga");

  assert.match(hash, /^scrypt\$/);
  assert.notEqual(hash, "clave-de-prueba-larga");
  assert.equal(await verifyPassword("clave-de-prueba-larga", hash), true);
  assert.equal(await verifyPassword("otra-clave", hash), false);
  assert.equal(await verifyPassword("clave", "invalid"), false);
});

test("auth tokens are signed and reject modified payloads", () => {
  const token = createToken("user-id");

  assert.equal(verifyToken(token)?.sub, "user-id");
  assert.equal(verifyToken(`${token}x`), null);
});
