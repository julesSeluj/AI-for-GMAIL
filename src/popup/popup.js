import { getProvider, resolveBaseUrl, originPattern } from "../lib/providers.js";
import { getSettings, getApiKey } from "../lib/storage.js";
import { localizePage } from "../lib/i18n-dom.js";

document.addEventListener("DOMContentLoaded", async () => {
  localizePage();

  const settings = await getSettings();
  const provider = getProvider(settings.provider);

  document.getElementById("providerName").textContent = provider ? provider.label : settings.provider;
  const model = settings.models?.[settings.provider] || provider?.defaultModel || "—";
  document.getElementById("modelName").textContent = model;

  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");

  if (!provider) {
    dot.classList.add("warn");
    text.textContent = chrome.i18n.getMessage("errorNetwork");
    return;
  }

  if (provider.needsKey) {
    const key = await getApiKey(provider.id);
    if (!key) {
      dot.classList.add("warn");
      text.textContent = chrome.i18n.getMessage("popupNoKey");
      return;
    }
  }

  const baseUrl = resolveBaseUrl(provider, settings);
  if (baseUrl) {
    const origin = originPattern(baseUrl);
    const hasPermission = await chrome.permissions.contains({ origins: [origin] });
    if (!hasPermission) {
      dot.classList.add("warn");
      text.textContent = chrome.i18n.getMessage("popupNoPermission");
      return;
    }
  }

  dot.classList.add("ok");
  text.textContent = chrome.i18n.getMessage("popupReady");

  document.getElementById("optionsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
