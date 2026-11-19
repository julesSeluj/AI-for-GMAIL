import { getProvider, resolveBaseUrl, originPattern } from "../lib/providers.js";
import { getSettings, getApiKey } from "../lib/storage.js";
import { buildMessages } from "../lib/prompt.js";
import { streamCompletion } from "../lib/llm.js";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "openOptions") chrome.runtime.openOptionsPage();
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ai4g-generate") return;

  let abortController = null;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "start") return;

    abortController = new AbortController();

    try {
      const settings = await getSettings();
      const provider = getProvider(settings.provider);
      if (!provider) {
        port.postMessage({ type: "error", code: "provider", message: "Unknown provider" });
        return;
      }

      const model = settings.models?.[provider.id] || provider.defaultModel;
      if (!model) {
        port.postMessage({ type: "error", code: "no_model", message: "No model selected" });
        return;
      }

      const apiKey = await getApiKey(provider.id);
      if (provider.needsKey && !apiKey) {
        port.postMessage({ type: "error", code: "no_key", message: "API key not configured" });
        return;
      }

      const baseUrl = resolveBaseUrl(provider, settings);
      const origin = originPattern(baseUrl);
      const hasPermission = await chrome.permissions.contains({ origins: [origin] });
      if (!hasPermission) {
        port.postMessage({ type: "error", code: "no_permission", message: `Host permission needed for ${origin}` });
        return;
      }

      const { system, messages } = buildMessages(msg.request);

      for await (const text of streamCompletion({
        provider,
        baseUrl,
        apiKey,
        model,
        system,
        messages,
        signal: abortController.signal
      })) {
        port.postMessage({ type: "chunk", text });
      }

      port.postMessage({ type: "done" });
    } catch (err) {
      if (err.name === "AbortError") return;
      port.postMessage({
        type: "error",
        code: err.code || "network",
        message: err.message || "Unknown error"
      });
    }
  });

  port.onDisconnect.addListener(() => {
    if (abortController) abortController.abort();
  });
});
