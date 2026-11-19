import { parseSSE } from "./sse.js";

export async function* streamCompletion({ provider, baseUrl, apiKey, model, system, messages, signal }) {
  if (provider.kind === "openai") {
    yield* streamOpenAI({ baseUrl, apiKey, model, system, messages, signal });
  } else if (provider.kind === "anthropic") {
    yield* streamAnthropic({ baseUrl, apiKey, model, system, messages, signal });
  } else {
    throw new Error(`Unknown provider kind: ${provider.kind}`);
  }
}

async function* streamOpenAI({ baseUrl, apiKey, model, system, messages, signal }) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const body = {
    model,
    stream: true,
    messages: [{ role: "system", content: system }, ...messages]
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) throw makeHttpError(res.status);

  for await (const event of parseSSE(res.body)) {
    if (event.data === "[DONE]") return;
    try {
      const json = JSON.parse(event.data);
      const text = json.choices?.[0]?.delta?.content;
      if (text) yield text;
    } catch { /* skip unparseable chunks */ }
  }
}

async function* streamAnthropic({ baseUrl, apiKey, model, system, messages, signal }) {
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };

  const body = {
    model,
    max_tokens: 2048,
    stream: true,
    system,
    messages
  };

  const res = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) throw makeHttpError(res.status);

  for await (const event of parseSSE(res.body)) {
    if (event.event === "message_stop") return;
    if (event.event === "content_block_delta") {
      try {
        const json = JSON.parse(event.data);
        if (json.delta?.type === "text_delta" && json.delta.text) {
          yield json.delta.text;
        }
      } catch { /* skip */ }
    }
  }
}

function makeHttpError(status) {
  let code;
  if (status === 401 || status === 403) code = "auth";
  else if (status === 429) code = "rate_limit";
  else code = "provider";
  const err = new Error(`HTTP ${status}`);
  err.code = code;
  return err;
}

export async function listModels({ provider, baseUrl, apiKey }) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (provider.kind === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  }

  const res = await fetch(`${baseUrl}/models`, { headers });
  if (!res.ok) throw makeHttpError(res.status);
  const json = await res.json();
  return (json.data || []).map(m => m.id).sort();
}
