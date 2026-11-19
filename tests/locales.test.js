import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync("src/_locales/en/messages.json", "utf-8"));
const fr = JSON.parse(readFileSync("src/_locales/fr/messages.json", "utf-8"));

describe("locale files", () => {
  it("en and fr have the same keys", () => {
    const enKeys = Object.keys(en).sort();
    const frKeys = Object.keys(fr).sort();
    assert.deepStrictEqual(enKeys, frKeys);
  });

  it("every entry has a non-empty message", () => {
    for (const [key, val] of Object.entries(en)) {
      assert.ok(val.message && val.message.length > 0, `en.${key} has empty message`);
    }
    for (const [key, val] of Object.entries(fr)) {
      assert.ok(val.message && val.message.length > 0, `fr.${key} has empty message`);
    }
  });

  it("placeholder keys match between locales", () => {
    for (const key of Object.keys(en)) {
      const enPlaceholders = Object.keys(en[key].placeholders || {}).sort();
      const frPlaceholders = Object.keys(fr[key].placeholders || {}).sort();
      assert.deepStrictEqual(enPlaceholders, frPlaceholders, `placeholder mismatch for ${key}`);
    }
  });
});
