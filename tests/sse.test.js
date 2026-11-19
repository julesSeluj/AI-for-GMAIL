import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSSE } from "../src/lib/sse.js";

function makeStream(chunks) {
  const encoder = new TextEncoder();
  const encoded = chunks.map(c => typeof c === "string" ? encoder.encode(c) : c);
  return new ReadableStream({
    start(controller) {
      for (const chunk of encoded) controller.enqueue(chunk);
      controller.close();
    }
  });
}

async function collect(stream) {
  const events = [];
  for await (const ev of parseSSE(stream)) events.push(ev);
  return events;
}

describe("parseSSE", () => {
  it("parses a simple event", async () => {
    const events = await collect(makeStream(["data: hello\n\n"]));
    assert.deepStrictEqual(events, [{ event: "", data: "hello" }]);
  });

  it("parses two events in one chunk", async () => {
    const events = await collect(makeStream(["data: one\n\ndata: two\n\n"]));
    assert.equal(events.length, 2);
    assert.equal(events[0].data, "one");
    assert.equal(events[1].data, "two");
  });

  it("handles event split across two chunks", async () => {
    const events = await collect(makeStream(["data: hel", "lo world\n\n"]));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello world");
  });

  it("handles multi-byte UTF-8 split between chunks", async () => {
    const bytes = new TextEncoder().encode("data: café\n\n");
    const mid = bytes.indexOf(0xC3);
    const chunk1 = bytes.slice(0, mid);
    const chunk2 = bytes.slice(mid);
    const events = await collect(makeStream([chunk1, chunk2]));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "café");
  });

  it("concatenates multiple data lines with newline", async () => {
    const events = await collect(makeStream(["data: line1\ndata: line2\n\n"]));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "line1\nline2");
  });

  it("ignores comment lines", async () => {
    const events = await collect(makeStream([": this is a comment\ndata: value\n\n"]));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "value");
  });

  it("captures the event field", async () => {
    const events = await collect(makeStream(["event: message\ndata: hi\n\n"]));
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "message");
    assert.equal(events[0].data, "hi");
  });

  it("handles trailing event without final double newline", async () => {
    const events = await collect(makeStream(["data: last"]));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "last");
  });
});
