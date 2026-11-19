import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMessages } from "../src/lib/prompt.js";

describe("buildMessages", () => {
  it("compose contains the instruction", () => {
    const { system, messages } = buildMessages({
      action: "compose",
      instruction: "Thank John for the meeting",
      tone: "formal",
      length: "short"
    });
    assert.ok(system.includes("formal"));
    assert.ok(system.includes("short"));
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, "user");
    assert.ok(messages[0].content.includes("Thank John for the meeting"));
  });

  it("compose throws without instruction", () => {
    assert.throws(() => buildMessages({ action: "compose", tone: "neutral", length: "medium" }), /instruction/);
  });

  it("reply contains subject and messages in order", () => {
    const { system, messages } = buildMessages({
      action: "reply",
      instruction: "",
      tone: "neutral",
      length: "medium",
      thread: {
        subject: "Project update",
        messages: [
          { from: "Alice <alice@test.com>", text: "How is it going?" },
          { from: "Bob <bob@test.com>", text: "Great, almost done." }
        ]
      }
    });
    assert.ok(system.includes("reply"));
    assert.equal(messages.length, 1);
    assert.ok(messages[0].content.includes("Project update"));
    const aliceIdx = messages[0].content.indexOf("Alice");
    const bobIdx = messages[0].content.indexOf("Bob");
    assert.ok(aliceIdx < bobIdx, "messages should be in order");
  });

  it("reply works with empty instruction", () => {
    const { messages } = buildMessages({
      action: "reply",
      instruction: "",
      tone: "neutral",
      length: "medium",
      thread: { subject: "Hi", messages: [{ from: "X", text: "Hello" }] }
    });
    assert.equal(messages[0].role, "user");
    assert.ok(!messages[0].content.includes("Additional instructions"));
  });

  it("improve with translate contains targetLang", () => {
    const { system } = buildMessages({
      action: "improve",
      improveMode: "translate",
      targetLang: "Spanish",
      draft: "Bonjour le monde",
      tone: "neutral",
      length: "medium"
    });
    assert.ok(system.includes("Spanish"));
  });

  it("improve translate throws without targetLang", () => {
    assert.throws(() => buildMessages({
      action: "improve",
      improveMode: "translate",
      draft: "text",
      tone: "neutral",
      length: "medium"
    }), /targetLang/);
  });

  it("tone and length appear in system", () => {
    const { system } = buildMessages({
      action: "compose",
      instruction: "hi",
      tone: "friendly",
      length: "long"
    });
    assert.ok(system.includes("friendly"));
    assert.ok(system.includes("long"));
  });

  it("last message has role user", () => {
    const { messages } = buildMessages({
      action: "compose",
      instruction: "test",
      tone: "neutral",
      length: "medium"
    });
    assert.equal(messages[messages.length - 1].role, "user");
  });

  it("unknown action throws", () => {
    assert.throws(() => buildMessages({ action: "dance", tone: "neutral", length: "medium" }), /Unknown action/);
  });

  it("unknown improveMode throws", () => {
    assert.throws(() => buildMessages({
      action: "improve",
      improveMode: "yell",
      draft: "text",
      tone: "neutral",
      length: "medium"
    }), /Unknown improveMode/);
  });
});
