const BUTTON_ICON = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>`;

function getEmailContext() {
  const thread = document.querySelector('.a3s.aiL');
  return thread ? thread.innerText.slice(0, 3000) : "";
}

function createButton() {
  const btn = document.createElement("button");
  btn.className = "ai4gmail-btn";
  btn.type = "button";
  btn.innerHTML = `${BUTTON_ICON} AI Write`;
  btn.dataset.ai4gmail = "true";
  return btn;
}

function createPanel() {
  const panel = document.createElement("div");
  panel.className = "ai4gmail-panel";
  panel.innerHTML = `
    <div class="ai4gmail-panel-header">
      <span>AI for Gmail</span>
      <button class="ai4gmail-panel-close">&times;</button>
    </div>
    <div class="ai4gmail-panel-body">
      <textarea class="ai4gmail-textarea" placeholder="Describe the email you want to write…"></textarea>
      <div class="ai4gmail-actions">
        <button class="ai4gmail-generate">Generate</button>
      </div>
      <div class="ai4gmail-output"></div>
    </div>`;
  return panel;
}

function attachToCompose(toolbar) {
  if (toolbar.querySelector('[data-ai4gmail]')) return;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative;display:inline-block;";
  const btn = createButton();
  wrapper.appendChild(btn);
  toolbar.prepend(wrapper);

  btn.addEventListener("click", () => {
    let panel = wrapper.querySelector(".ai4gmail-panel");
    if (panel) {
      panel.remove();
      return;
    }
    panel = createPanel();
    wrapper.appendChild(panel);

    panel.querySelector(".ai4gmail-panel-close").addEventListener("click", () => panel.remove());

    const textarea = panel.querySelector(".ai4gmail-textarea");
    const generateBtn = panel.querySelector(".ai4gmail-generate");
    const output = panel.querySelector(".ai4gmail-output");

    generateBtn.addEventListener("click", async () => {
      const prompt = textarea.value.trim();
      if (!prompt) return;

      generateBtn.disabled = true;
      output.innerHTML = `<div class="ai4gmail-loading"><div class="ai4gmail-spinner"></div>Generating…</div>`;

      const settings = await chrome.storage.sync.get(["llmProvider", "llmModel", "apiKey", "customEndpoint"]);
      if (!settings.apiKey) {
        output.innerHTML = `<div class="ai4gmail-error">API key not set. Go to extension options to configure.</div>`;
        generateBtn.disabled = false;
        return;
      }

      const context = getEmailContext();
      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_EMAIL",
        payload: {
          prompt,
          context,
          provider: settings.llmProvider,
          model: settings.llmModel,
          apiKey: settings.apiKey
        }
      });

      generateBtn.disabled = false;
      if (response.ok) {
        output.innerHTML = `
          <div class="ai4gmail-preview">${escapeHtml(response.text)}</div>
          <div class="ai4gmail-actions" style="margin-top:8px">
            <button class="ai4gmail-insert">Insert into email</button>
          </div>`;
        output.querySelector(".ai4gmail-insert").addEventListener("click", () => {
          const compose = toolbar.closest('[role="dialog"]') || toolbar.closest('form');
          const body = compose?.querySelector('div[aria-label][contenteditable="true"]');
          if (body) {
            body.innerHTML = escapeHtml(response.text).replace(/\n/g, "<br>");
            body.dispatchEvent(new Event("input", { bubbles: true }));
          }
          panel.remove();
        });
      } else {
        output.innerHTML = `<div class="ai4gmail-error">${escapeHtml(response.error)}</div>`;
      }
    });

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        generateBtn.click();
      }
    });

    textarea.focus();
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function scanForComposeWindows() {
  const toolbars = document.querySelectorAll('.btC');
  toolbars.forEach((toolbar) => attachToCompose(toolbar));
}

const observer = new MutationObserver(() => scanForComposeWindows());
observer.observe(document.body, { childList: true, subtree: true });
scanForComposeWindows();
