chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("llmProvider", (data) => {
    if (!data.llmProvider) {
      chrome.storage.sync.set({ llmProvider: "openai", llmModel: "gpt-4o" });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_EMAIL") {
    handleGenerate(message.payload).then(sendResponse);
    return true;
  }
});

async function handleGenerate({ prompt, context, provider, model, apiKey }) {
  try {
    const response = await callLLM({ prompt, context, provider, model, apiKey });
    return { ok: true, text: response };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function callLLM({ prompt, context, provider, model, apiKey }) {
  const systemPrompt = `You are an email writing assistant inside Gmail. Write professional, clear emails. Reply in the same language as the user's prompt. If context from a previous email is provided, use it to write a relevant reply.`;

  const messages = [];
  if (context) {
    messages.push({ role: "user", content: `Previous email thread:\n${context}` });
    messages.push({ role: "assistant", content: "Understood. I'll use this context." });
  }
  messages.push({ role: "user", content: prompt });

  if (provider === "openai") {
    return callOpenAI({ apiKey, model, systemPrompt, messages });
  }
  if (provider === "anthropic") {
    return callAnthropic({ apiKey, model, systemPrompt, messages });
  }
  if (provider === "custom") {
    return callCustomEndpoint({ apiKey, model, systemPrompt, messages });
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function callOpenAI({ apiKey, model, systemPrompt, messages }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic({ apiKey, model, systemPrompt, messages }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    })
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callCustomEndpoint({ apiKey, model, systemPrompt, messages }) {
  const { customEndpoint } = await chrome.storage.sync.get("customEndpoint");
  if (!customEndpoint) throw new Error("Custom endpoint URL not configured");
  const res = await fetch(customEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`Custom API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
