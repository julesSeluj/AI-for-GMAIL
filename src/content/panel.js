(function () {
  "use strict";

  const AI4G = globalThis.AI4G = globalThis.AI4G || {};
  const panel = AI4G.panel = {};
  const gmail = AI4G.gmail;

  let currentPanel = null;
  let currentPort = null;

  function msg(key, sub) {
    try {
      return chrome.i18n.getMessage(key, sub) || key;
    } catch { return key; }
  }

  panel.open = function ({ anchor, body }) {
    panel.close();

    const savedSel = gmail.saveSelection(body);
    const thread = gmail.getThread();
    const draftText = gmail.getDraftText(body);
    const hasSelection = savedSel && savedSel.text.length > 0;

    let initialTab;
    if (hasSelection) initialTab = "improve";
    else if (thread) initialTab = "reply";
    else initialTab = "compose";

    const el = document.createElement("div");
    el.className = "ai4g-panel";
    el.setAttribute("role", "dialog");
    el.innerHTML = buildPanelHTML(initialTab, thread, draftText, hasSelection);
    document.body.appendChild(el);
    currentPanel = el;

    positionPanel(el, anchor);

    const onScroll = () => positionPanel(el, anchor);
    const onResize = () => positionPanel(el, anchor);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    const state = {
      el, body, anchor, savedSel, thread, draftText,
      generating: false, lastRequest: null
    };

    setupTabs(state);
    setupGeneration(state);

    el.querySelector(".ai4g-close").addEventListener("click", () => panel.close());

    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") panel.close();
    });

    const onClickOutside = (e) => {
      if (currentPanel && !currentPanel.contains(e.target) && !anchor.contains(e.target)) {
        panel.close();
      }
    };
    setTimeout(() => document.addEventListener("click", onClickOutside), 0);

    el._cleanup = () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClickOutside);
      if (currentPort) { try { currentPort.disconnect(); } catch {} currentPort = null; }
    };

    const textarea = el.querySelector(".ai4g-instruction");
    if (textarea) textarea.focus();
  };

  panel.close = function () {
    if (!currentPanel) return;
    if (currentPanel._cleanup) currentPanel._cleanup();
    currentPanel.remove();
    currentPanel = null;
  };

  panel.isOpen = function () {
    return currentPanel !== null;
  };

  function positionPanel(el, anchor) {
    const rect = anchor.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.left = Math.max(16, rect.left) + "px";
    el.style.bottom = (window.innerHeight - rect.top + 8) + "px";
    el.style.zIndex = "10001";
  }

  function buildPanelHTML(initialTab, thread, draftText, hasSelection) {
    const tabs = [
      { id: "compose", label: msg("tabCompose"), disabled: false },
      { id: "reply", label: msg("tabReply"), disabled: !thread },
      { id: "improve", label: msg("tabImprove"), disabled: !draftText && !hasSelection }
    ];

    const tabsHTML = tabs.map(t =>
      `<button class="ai4g-tab${t.id === initialTab ? " ai4g-tab-active" : ""}" data-tab="${t.id}" ${t.disabled ? "disabled" : ""}>${t.label}</button>`
    ).join("");

    return `
      <div class="ai4g-header">
        <span class="ai4g-title">${msg("panelTitle")}</span>
        <button class="ai4g-close" aria-label="${msg("btnClose")}">&times;</button>
      </div>
      <div class="ai4g-tabs">${tabsHTML}</div>
      <div class="ai4g-body">
        <div class="ai4g-improve-options" style="display:${initialTab === "improve" ? "block" : "none"}">
          <select class="ai4g-improve-mode">
            <option value="fix">${msg("improveFix")}</option>
            <option value="rephrase">${msg("improveRephrase")}</option>
            <option value="shorten">${msg("improveShorter")}</option>
            <option value="expand">${msg("improveLonger")}</option>
            <option value="translate">${msg("improveTranslate")}</option>
          </select>
          <input type="text" class="ai4g-target-lang" placeholder="${msg("targetLangPlaceholder")}" style="display:none">
        </div>
        <textarea class="ai4g-instruction" placeholder="${initialTab === "reply" ? msg("instructionReplyPlaceholder") : msg("instructionPlaceholder")}" rows="3"></textarea>
        <div class="ai4g-controls">
          <select class="ai4g-tone">
            <option value="neutral">${msg("toneNeutral")}</option>
            <option value="formal">${msg("toneFormal")}</option>
            <option value="friendly">${msg("toneFriendly")}</option>
            <option value="direct">${msg("toneDirect")}</option>
          </select>
          <select class="ai4g-length">
            <option value="short">${msg("lengthShort")}</option>
            <option value="medium" selected>${msg("lengthMedium")}</option>
            <option value="long">${msg("lengthLong")}</option>
          </select>
          <button class="ai4g-generate">${msg("btnGenerate")}</button>
        </div>
        <div class="ai4g-output" style="display:none"></div>
        <div class="ai4g-actions" style="display:none">
          <button class="ai4g-insert">${msg("btnInsert")}</button>
          <button class="ai4g-regenerate">${msg("btnRegenerate")}</button>
          <button class="ai4g-copy">${msg("btnCopy")}</button>
        </div>
      </div>`;
  }

  function setupTabs(state) {
    const el = state.el;
    for (const tab of el.querySelectorAll(".ai4g-tab")) {
      tab.addEventListener("click", () => {
        if (tab.disabled) return;
        el.querySelector(".ai4g-tab-active")?.classList.remove("ai4g-tab-active");
        tab.classList.add("ai4g-tab-active");

        const id = tab.dataset.tab;
        const improveOpts = el.querySelector(".ai4g-improve-options");
        const instruction = el.querySelector(".ai4g-instruction");

        improveOpts.style.display = id === "improve" ? "block" : "none";
        instruction.placeholder = id === "reply" ? msg("instructionReplyPlaceholder") : msg("instructionPlaceholder");
      });
    }

    const modeSelect = el.querySelector(".ai4g-improve-mode");
    const langInput = el.querySelector(".ai4g-target-lang");
    modeSelect.addEventListener("change", () => {
      langInput.style.display = modeSelect.value === "translate" ? "block" : "none";
    });
  }

  function setupGeneration(state) {
    const el = state.el;
    const generateBtn = el.querySelector(".ai4g-generate");
    const outputEl = el.querySelector(".ai4g-output");
    const actionsEl = el.querySelector(".ai4g-actions");

    generateBtn.addEventListener("click", () => {
      if (state.generating) {
        stopGeneration();
        return;
      }
      startGeneration(state);
    });

    el.querySelector(".ai4g-instruction").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        generateBtn.click();
      }
    });

    el.querySelector(".ai4g-regenerate").addEventListener("click", () => startGeneration(state));

    el.querySelector(".ai4g-insert").addEventListener("click", () => {
      const text = outputEl.textContent;
      if (!text) return;

      const activeTab = el.querySelector(".ai4g-tab-active")?.dataset.tab;
      let mode;
      if (activeTab === "improve" && state.savedSel?.text) mode = "replaceSelection";
      else if (activeTab === "improve") mode = "replaceDraft";
      else mode = "prepend";

      if (mode === "replaceSelection") gmail.restoreSelection(state.body, state.savedSel);
      gmail.insertText(state.body, text, mode);
      panel.close();
    });

    el.querySelector(".ai4g-copy").addEventListener("click", () => {
      navigator.clipboard.writeText(outputEl.textContent);
    });

    function startGeneration(state) {
      const activeTab = el.querySelector(".ai4g-tab-active")?.dataset.tab || "compose";
      const instruction = el.querySelector(".ai4g-instruction").value.trim();
      const tone = el.querySelector(".ai4g-tone").value;
      const length = el.querySelector(".ai4g-length").value;

      const request = {
        action: activeTab,
        instruction,
        tone,
        length,
        uiLang: chrome.i18n.getUILanguage?.() || "en"
      };

      if (activeTab === "reply") {
        request.thread = state.thread;
      } else if (activeTab === "improve") {
        request.improveMode = el.querySelector(".ai4g-improve-mode").value;
        request.draft = state.savedSel?.text || state.draftText;
        if (request.improveMode === "translate") {
          request.targetLang = el.querySelector(".ai4g-target-lang").value.trim() || "English";
        }
      }

      state.lastRequest = request;
      state.generating = true;
      generateBtn.textContent = msg("btnStop");
      outputEl.style.display = "block";
      outputEl.textContent = "";
      actionsEl.style.display = "none";

      currentPort = chrome.runtime.connect({ name: "ai4g-generate" });
      currentPort.postMessage({ type: "start", request });

      currentPort.onMessage.addListener((m) => {
        if (m.type === "chunk") {
          outputEl.textContent += m.text;
        } else if (m.type === "done") {
          finishGeneration();
        } else if (m.type === "error") {
          showError(m.code, m.message);
          finishGeneration();
        }
      });

      currentPort.onDisconnect.addListener(() => {
        if (state.generating) finishGeneration();
      });
    }

    function stopGeneration() {
      if (currentPort) { try { currentPort.disconnect(); } catch {} currentPort = null; }
      finishGeneration();
    }

    function finishGeneration() {
      state.generating = false;
      generateBtn.textContent = msg("btnGenerate");
      if (outputEl.textContent.trim()) {
        actionsEl.style.display = "flex";
      }
    }

    function showError(code, message) {
      const errorKey = {
        no_key: "errorNoKey",
        no_model: "errorNoModel",
        no_permission: "errorNoPermission",
        auth: "errorAuth",
        rate_limit: "errorRateLimit",
        network: "errorNetwork",
        provider: "errorProvider"
      }[code] || "errorNetwork";

      const text = code === "provider" ? msg(errorKey, [message]) : msg(errorKey);
      outputEl.textContent = text;
      outputEl.classList.add("ai4g-error");

      if (["no_key", "no_model", "no_permission"].includes(code)) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = " " + msg("linkOpenSettings");
        link.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.runtime.sendMessage({ type: "openOptions" });
        });
        outputEl.appendChild(link);
      }

      setTimeout(() => outputEl.classList.remove("ai4g-error"), 5000);
    }
  }
})();
