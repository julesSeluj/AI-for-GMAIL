const MODEL_HINTS = {
  openai: "Popular: gpt-4o, gpt-4o-mini, gpt-4-turbo, o1",
  anthropic: "Popular: claude-sonnet-5-5, claude-opus-5-5, claude-haiku-5-5",
  custom: "Model name depends on your endpoint"
};

document.addEventListener("DOMContentLoaded", async () => {
  const provider = document.getElementById("provider");
  const model = document.getElementById("model");
  const apiKey = document.getElementById("apiKey");
  const customEndpoint = document.getElementById("customEndpoint");
  const customBlock = document.getElementById("customEndpointBlock");
  const hint = document.getElementById("modelHint");
  const saveBtn = document.getElementById("save");
  const saved = document.getElementById("saved");

  const data = await chrome.storage.sync.get(["llmProvider", "llmModel", "apiKey", "customEndpoint"]);
  provider.value = data.llmProvider || "openai";
  model.value = data.llmModel || "";
  apiKey.value = data.apiKey || "";
  customEndpoint.value = data.customEndpoint || "";

  function updateUI() {
    hint.textContent = MODEL_HINTS[provider.value] || "";
    customBlock.classList.toggle("visible", provider.value === "custom");
  }
  provider.addEventListener("change", updateUI);
  updateUI();

  saveBtn.addEventListener("click", async () => {
    if (provider.value === "custom") {
      let origin;
      try {
        origin = new URL(customEndpoint.value.trim()).origin;
      } catch {
        hint.textContent = "Invalid endpoint URL";
        return;
      }
      const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
      if (!granted) {
        hint.textContent = "Permission to reach this endpoint was denied";
        return;
      }
    }
    chrome.storage.sync.set({
      llmProvider: provider.value,
      llmModel: model.value.trim(),
      apiKey: apiKey.value.trim(),
      customEndpoint: customEndpoint.value.trim()
    }, () => {
      saved.classList.add("show");
      setTimeout(() => saved.classList.remove("show"), 2000);
    });
  });
});
