const DEFAULT_SETTINGS = {
  provider: "openai",
  models: {},
  customBaseUrl: "",
  tone: "neutral",
  length: "medium"
};

export async function getSettings() {
  const { settings } = await chrome.storage.sync.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  await chrome.storage.sync.set({ settings: merged });
  return merged;
}

export async function getApiKey(providerId) {
  const { apiKeys } = await chrome.storage.local.get("apiKeys");
  return (apiKeys || {})[providerId] || "";
}

export async function setApiKey(providerId, key) {
  const { apiKeys } = await chrome.storage.local.get("apiKeys");
  const updated = { ...(apiKeys || {}), [providerId]: key };
  await chrome.storage.local.set({ apiKeys: updated });
}
