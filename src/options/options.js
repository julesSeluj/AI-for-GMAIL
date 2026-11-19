import { PROVIDERS, getProvider, resolveBaseUrl, originPattern } from "../lib/providers.js";
import { getSettings, saveSettings, getApiKey, setApiKey } from "../lib/storage.js";
import { listModels } from "../lib/llm.js";
import { localizePage } from "../lib/i18n-dom.js";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  localizePage();

  const providerSelect = $("provider");
  const apiKeyInput = $("apiKey");
  const modelInput = $("model");
  const modelList = $("modelList");
  const customUrlInput = $("customUrl");
  const toneSelect = $("tone");
  const lengthSelect = $("length");
  const statusEl = $("status");

  for (const p of PROVIDERS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    providerSelect.appendChild(opt);
  }

  const settings = await getSettings();
  providerSelect.value = settings.provider;
  toneSelect.value = settings.tone;
  lengthSelect.value = settings.length;
  customUrlInput.value = settings.customBaseUrl || "";

  await loadProviderUI();

  providerSelect.addEventListener("change", loadProviderUI);

  async function loadProviderUI() {
    const p = getProvider(providerSelect.value);
    if (!p) return;

    $("keyField").classList.toggle("hidden", !p.needsKey);
    $("customUrlField").classList.toggle("hidden", p.id !== "custom");
    $("ollamaHelp").classList.toggle("hidden", p.id !== "ollama");

    apiKeyInput.value = await getApiKey(p.id);
    modelInput.value = settings.models?.[p.id] || p.defaultModel;

    modelList.innerHTML = "";
    for (const s of p.suggestions) {
      const opt = document.createElement("option");
      opt.value = s;
      modelList.appendChild(opt);
    }
  }

  let keyVisible = false;
  $("toggleKey").addEventListener("click", () => {
    keyVisible = !keyVisible;
    apiKeyInput.type = keyVisible ? "text" : "password";
    $("toggleKey").textContent = chrome.i18n.getMessage(keyVisible ? "optHideKey" : "optShowKey");
  });

  $("save").addEventListener("click", async () => {
    const providerId = providerSelect.value;
    const p = getProvider(providerId);
    if (!p) return;

    if (p.id === "custom") {
      const url = customUrlInput.value.trim();
      if (!url) {
        showStatus("err", "URL required");
        return;
      }
      try { new URL(url); } catch {
        showStatus("err", "Invalid URL");
        return;
      }
    }

    const baseUrl = p.id === "custom" ? customUrlInput.value.trim() : p.baseUrl;
    const origin = originPattern(baseUrl);

    if (origin && !origin.startsWith("http://localhost")) {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        showStatus("err", chrome.i18n.getMessage("optPermissionDenied"));
        return;
      }
    }

    const models = { ...(settings.models || {}), [providerId]: modelInput.value.trim() };

    await saveSettings({
      provider: providerId,
      models,
      customBaseUrl: customUrlInput.value.trim(),
      tone: toneSelect.value,
      length: lengthSelect.value
    });

    if (p.needsKey) {
      await setApiKey(providerId, apiKeyInput.value.trim());
    }

    Object.assign(settings, { provider: providerId, models, tone: toneSelect.value, length: lengthSelect.value });
    showStatus("ok", chrome.i18n.getMessage("optSaved"));
  });

  $("loadModels").addEventListener("click", async () => {
    const p = getProvider(providerSelect.value);
    if (!p) return;
    const baseUrl = resolveBaseUrl(p, { customBaseUrl: customUrlInput.value.trim() });
    const apiKey = apiKeyInput.value.trim();

    try {
      const models = await listModels({ provider: p, baseUrl, apiKey });
      modelList.innerHTML = "";
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m;
        modelList.appendChild(opt);
      }
      showStatus("ok", `${models.length} models loaded`);
    } catch (err) {
      showStatus("err", err.message);
    }
  });

  $("testBtn").addEventListener("click", async () => {
    const port = chrome.runtime.connect({ name: "ai4g-generate" });
    const p = getProvider(providerSelect.value);

    port.postMessage({
      type: "start",
      request: {
        action: "compose",
        instruction: "Say OK",
        tone: "neutral",
        length: "short"
      }
    });

    let result = "";
    port.onMessage.addListener((m) => {
      if (m.type === "chunk") result += m.text;
      else if (m.type === "done") {
        showStatus("ok", chrome.i18n.getMessage("optTestSuccess"));
        port.disconnect();
      } else if (m.type === "error") {
        const key = {
          no_key: "errorNoKey", no_model: "errorNoModel",
          no_permission: "errorNoPermission", auth: "errorAuth",
          rate_limit: "errorRateLimit", network: "errorNetwork",
          provider: "errorProvider"
        }[m.code] || "errorNetwork";
        showStatus("err", chrome.i18n.getMessage(key, [m.message]));
        port.disconnect();
      }
    });
  });

  function showStatus(type, text) {
    statusEl.className = "status " + type;
    statusEl.textContent = text;
    setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status"; }, 4000);
  }
});
