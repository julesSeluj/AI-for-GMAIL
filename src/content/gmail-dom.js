(function () {
  "use strict";

  const AI4G = globalThis.AI4G = globalThis.AI4G || {};
  const gmail = AI4G.gmail = {};

  const SELECTORS = {
    composeBody: 'div[contenteditable="true"][role="textbox"]',
    sendToolbar: ".btC",
    threadMessage: ".a3s.aiL",
    senderTag: ".gD",
    threadSubject: "h2.hP"
  };

  gmail.SELECTORS = SELECTORS;

  gmail.findComposeToolbars = function () {
    return Array.from(document.querySelectorAll(SELECTORS.sendToolbar));
  };

  gmail.getComposeBody = function (toolbar) {
    const container = toolbar.closest('[role="dialog"]') || toolbar.closest("form") || toolbar.parentElement;
    if (!container) return null;
    return container.querySelector(SELECTORS.composeBody) || null;
  };

  gmail.getThread = function () {
    const subjectEl = document.querySelector(SELECTORS.threadSubject);
    if (!subjectEl) return null;

    const msgEls = document.querySelectorAll(SELECTORS.threadMessage);
    if (msgEls.length === 0) return null;

    const messages = [];
    const slice = Array.from(msgEls).slice(-6);

    for (const el of slice) {
      const container = el.closest("[data-message-id]") || el.closest(".gs");
      let from = "";
      if (container) {
        const sender = container.querySelector(SELECTORS.senderTag);
        if (sender) {
          const name = sender.getAttribute("name") || sender.textContent || "";
          const email = sender.getAttribute("email") || "";
          from = email ? `${name} <${email}>` : name;
        }
      }
      const text = (el.innerText || "").slice(0, 4000);
      messages.push({ from, text });
    }

    return {
      subject: subjectEl.textContent || "",
      messages
    };
  };

  gmail.getDraftText = function (body) {
    if (!body) return "";
    const clone = body.cloneNode(true);
    const quote = clone.querySelector(".gmail_quote");
    if (quote) quote.remove();
    const sig = clone.querySelector(".gmail_signature");
    if (sig) sig.remove();
    return clone.innerText || clone.textContent || "";
  };

  gmail.saveSelection = function (body) {
    if (!body) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!body.contains(range.startContainer)) return null;
    return { range: range.cloneRange(), text: sel.toString() };
  };

  gmail.restoreSelection = function (body, saved) {
    if (!body || !saved || !saved.range) return;
    body.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(saved.range);
  };

  gmail.insertText = function (body, text, mode) {
    if (!body || !text) return;

    body.focus();

    const escaped = escapeHtml(text).replace(/\n/g, "<br>");

    if (mode === "replaceSelection") {
      document.execCommand("insertHTML", false, escaped);
    } else if (mode === "replaceDraft") {
      const quote = body.querySelector(".gmail_quote");
      const sig = body.querySelector(".gmail_signature");
      const sel = window.getSelection();
      const range = document.createRange();

      if (quote || sig) {
        const first = body.firstChild || body;
        const boundary = sig || quote;
        range.setStartBefore(first === body ? body : first);
        range.setEndBefore(boundary);
      } else {
        range.selectNodeContents(body);
      }

      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertHTML", false, escaped);
    } else if (mode === "prepend") {
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(body, 0);
      range.setEnd(body, 0);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("insertHTML", false, escaped + "<br><br>");
    }
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
