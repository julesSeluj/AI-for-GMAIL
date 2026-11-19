document.addEventListener("DOMContentLoaded", async () => {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");

  const { apiKey, llmProvider } = await chrome.storage.sync.get(["apiKey", "llmProvider"]);
  if (apiKey) {
    dot.classList.add("ok");
    text.textContent = `Connected — ${llmProvider || "openai"}`;
  } else {
    dot.classList.add("err");
    text.textContent = "API key not configured";
  }

  document.getElementById("optionsBtn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
