import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS, getProvider, resolveBaseUrl, originPattern } from "../src/lib/providers.js";

describe("PROVIDERS table", () => {
  it("has unique ids", () => {
    const ids = PROVIDERS.map(p => p.id);
    assert.deepStrictEqual(ids, [...new Set(ids)]);
  });

  it("every provider has required fields", () => {
    for (const p of PROVIDERS) {
      assert.ok(p.id, "missing id");
      assert.ok(p.label, "missing label");
      assert.ok(["openai", "anthropic"].includes(p.kind), `invalid kind: ${p.kind}`);
      assert.equal(typeof p.needsKey, "boolean");
      assert.ok(Array.isArray(p.suggestions));
    }
  });
});

describe("getProvider", () => {
  it("returns the matching provider", () => {
    const p = getProvider("anthropic");
    assert.equal(p.id, "anthropic");
    assert.equal(p.kind, "anthropic");
  });

  it("returns undefined for unknown id", () => {
    assert.equal(getProvider("unknown"), undefined);
  });
});

describe("resolveBaseUrl", () => {
  it("returns provider baseUrl for non-custom", () => {
    const p = getProvider("openai");
    assert.equal(resolveBaseUrl(p, {}), "https://api.openai.com/v1");
  });

  it("returns customBaseUrl for custom provider", () => {
    const p = getProvider("custom");
    assert.equal(resolveBaseUrl(p, { customBaseUrl: "http://my-server:8080/v1" }), "http://my-server:8080/v1");
  });

  it("strips trailing slash from custom URL", () => {
    const p = getProvider("custom");
    assert.equal(resolveBaseUrl(p, { customBaseUrl: "http://my-server:8080/v1/" }), "http://my-server:8080/v1");
  });

  it("strips multiple trailing slashes", () => {
    const p = getProvider("custom");
    assert.equal(resolveBaseUrl(p, { customBaseUrl: "http://my-server:8080///" }), "http://my-server:8080");
  });

  it("returns empty string for custom with no URL", () => {
    const p = getProvider("custom");
    assert.equal(resolveBaseUrl(p, {}), "");
  });
});

describe("originPattern", () => {
  it("extracts origin with wildcard path", () => {
    assert.equal(originPattern("https://api.openai.com/v1"), "https://api.openai.com/*");
  });

  it("handles localhost with port", () => {
    assert.equal(originPattern("http://localhost:11434/v1"), "http://localhost:11434/*");
  });

  it("handles URL without path", () => {
    assert.equal(originPattern("https://api.mistral.ai/v1"), "https://api.mistral.ai/*");
  });
});
