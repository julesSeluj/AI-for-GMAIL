(function () {
  "use strict";

  const AI4G = globalThis.AI4G = globalThis.AI4G || {};
  const gmail = AI4G.gmail;
  const panel = AI4G.panel;

  const BUTTON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';

  let rafPending = false;

  function createButton() {
    const btn = document.createElement("button");
    btn.className = "ai4g-btn";
    btn.type = "button";
    btn.dataset.ai4g = "true";
    const svg = document.createElement("span");
    svg.innerHTML = BUTTON_SVG;
    btn.appendChild(svg.firstChild);
    const label = document.createElement("span");
    try { label.textContent = chrome.i18n.getMessage("btnAI") || "AI Write"; }
    catch { label.textContent = "AI Write"; }
    btn.appendChild(label);
    return btn;
  }

  function scan() {
    const toolbars = gmail.findComposeToolbars();
    for (const toolbar of toolbars) {
      if (toolbar.querySelector("[data-ai4g]")) continue;

      const body = gmail.getComposeBody(toolbar);
      const btn = createButton();
      toolbar.prepend(btn);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (panel.isOpen()) {
          panel.close();
        } else {
          panel.open({ anchor: btn, body });
        }
      });
    }
  }

  const observer = new MutationObserver(() => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      scan();
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  scan();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "openOptions") {
      chrome.runtime.openOptionsPage();
    }
  });
})();
