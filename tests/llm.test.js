import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { streamCompletion } from "../src/lib/llm.js";

const originalFetch = globalThis.fetch;

function makeSSEResponse(chunks, status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    }
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

function makeErrorResponse(status) {
  return new Response(JSON.stringify({ error: "fail" }), { status });
}

describe("streamCompletion — openai kind", () => {
  let capturedUrl, capturedHeaders;

  beforeEach(() => {
    capturedUrl = null;
    capturedHeaders = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reassembles streamed text", async () => {
    globalThis.fetch = async () => makeSSEResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n'
    ]);

    const chunks = [];
    for await (const c of streamCompletion({
      provider: { kind: "openai" },
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o",
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    })) {
      chunks.push(c);
    }
    assert.equal(chunks.join(""), "Hello world");
  });

  it("sends correct URL and headers", async () => {
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      return makeSSEResponse(['data: [DONE]\n\n']);
    };

    const gen = streamCompletion({
      provider: { kind: "openai" },
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o",
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    });
    for await (const _ of gen) { /* drain */ }

    assert.equal(capturedUrl, "https://api.openai.com/v1/chat/completions");
    assert.equal(capturedHeaders["Authorization"], "Bearer sk-test");
  });

  it("omits Authorization header when key is empty", async () => {
    globalThis.fetch = async (url, opts) => {
      capturedHeaders = opts.headers;
      return makeSSEResponse(['data: [DONE]\n\n']);
    };

    const gen = streamCompletion({
      provider: { kind: "openai" },
      baseUrl: "http://localhost:11434/v1",
      apiKey: "",
      model: "llama3.2",
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    });
    for await (const _ of gen) { /* drain */ }

    assert.equal(capturedHeaders["Authorization"], undefined);
  });

  for (const [status, code] of [[401, "auth"], [429, "rate_limit"], [500, "provider"]]) {
    it(`throws ${code} for HTTP ${status}`, async () => {
      globalThis.fetch = async () => makeErrorResponse(status);
      try {
        for await (const _ of streamCompletion({
          provider: { kind: "openai" },
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-test",
          model: "gpt-4o",
          system: "sys",
          messages: [{ role: "user", content: "hi" }]
        })) { /* drain */ }
        assert.fail("should have thrown");
      } catch (err) {
        assert.equal(err.code, code);
      }
    });
  }
});

describe("streamCompletion — anthropic kind", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("reassembles streamed text", async () => {
    globalThis.fetch = async () => makeSSEResponse([
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"Bonjour"}}\n\n',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":" le monde"}}\n\n',
      'event: message_stop\ndata: {}\n\n'
    ]);

    const chunks = [];
    for await (const c of streamCompletion({
      provider: { kind: "anthropic" },
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-5-5",
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    })) {
      chunks.push(c);
    }
    assert.equal(chunks.join(""), "Bonjour le monde");
  });

  it("sends correct URL and headers", async () => {
    let capturedUrl, capturedHeaders;
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      return makeSSEResponse(['event: message_stop\ndata: {}\n\n']);
    };

    const gen = streamCompletion({
      provider: { kind: "anthropic" },
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-5-5",
      system: "sys",
      messages: [{ role: "user", content: "hi" }]
    });
    for await (const _ of gen) { /* drain */ }

    assert.equal(capturedUrl, "https://api.anthropic.com/v1/messages");
    assert.equal(capturedHeaders["x-api-key"], "sk-ant-test");
    assert.equal(capturedHeaders["anthropic-version"], "2023-06-01");
    assert.equal(capturedHeaders["anthropic-dangerous-direct-browser-access"], "true");
  });

  for (const [status, code] of [[401, "auth"], [429, "rate_limit"], [500, "provider"]]) {
    it(`throws ${code} for HTTP ${status}`, async () => {
      globalThis.fetch = async () => makeErrorResponse(status);
      try {
        for await (const _ of streamCompletion({
          provider: { kind: "anthropic" },
          baseUrl: "https://api.anthropic.com/v1",
          apiKey: "sk-ant-test",
          model: "claude-sonnet-5-5",
          system: "sys",
          messages: [{ role: "user", content: "hi" }]
        })) { /* drain */ }
        assert.fail("should have thrown");
      } catch (err) {
        assert.equal(err.code, code);
      }
    });
  }
});
