const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

function hashPassword(rawPassword) {
  return createHash("sha256").update(rawPassword).digest("hex");
}

test("同じパスワードは同じハッシュになる", () => {
  const first = hashPassword("staff1234");
  const second = hashPassword("staff1234");
  assert.equal(first, second);
});

test("異なるパスワードは異なるハッシュになる", () => {
  const first = hashPassword("staff1234");
  const second = hashPassword("staff12345");
  assert.notEqual(first, second);
});
