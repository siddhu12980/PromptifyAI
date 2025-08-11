(() => {
  const STATE = {
    site: detectSite(location.hostname),
    enabled: true,
    busy: false,
    lastImproved: "",
    detachObservers: [],
  };

  console.log("[PE:content] boot on", location.hostname, "site:", STATE.site);

  // Utility: debounce
  function debounce(fn, delay = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  // Messaging helper with context invalidation handling
  async function sendMessage(msg) {
    return new Promise((resolve) => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          console.warn(
            "[PE:content] Extension context invalidated, reloading page..."
          );
          resolve({ ok: false, error: "Extension context invalidated" });
          return;
        }

        chrome.runtime.sendMessage(msg, (res) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[PE:content] Runtime error:",
              chrome.runtime.lastError.message
            );
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res);
          }
        });
      } catch (e) {
        console.warn("[PE:content] sendMessage error", e);
        resolve({ ok: false, error: "Runtime messaging failed" });
      }
    });
  }

  // Detect which site
  function detectSite(host) {
    if (/chat\.openai\.com$/.test(host) || /chatgpt\.com$/.test(host))
      return "ChatGPT";
    if (/claude\.ai$/.test(host)) return "Claude";
    return "Unknown";
  }

  // Read settings to see if enabled and update UI accordingly
  async function initSettings() {
    try {
      const res = await sendMessage({ type: "get-settings" });
      if (res?.ok) {
        STATE.enabled = !!res.settings.enabled;
        console.log("[PE:content] settings loaded, enabled:", STATE.enabled);

        // Update button visibility based on enabled state
        updateButtonVisibility();
      } else {
        console.warn("[PE:content] failed to read settings:", res?.error);
        // Default to enabled if we can't read settings
        STATE.enabled = true;
        updateButtonVisibility();
      }
    } catch (error) {
      console.warn("[PE:content] settings error:", error);
      STATE.enabled = true; // Default to enabled on error
      updateButtonVisibility();
    }
  }

  // Update button visibility based on enabled state
  function updateButtonVisibility() {
    if (STATE.enabled) {
      // Extension is enabled - show button
      if (!overlayRoot) {
        // Create overlay if it doesn't exist
        console.log("[PE:content] Creating overlay - extension enabled");
        mountOverlay();

        // Set up DOM observer
        const mo = new MutationObserver(debounce(positionOverlay, 300));
        mo.observe(document.body, { childList: true, subtree: true });
        STATE.detachObservers.push(() => mo.disconnect());
      } else {
        // Show existing overlay
        const host = overlayRoot.getRootNode().host;
        if (host) {
          host.style.display = "block";
          host.style.opacity = "1";
        }
      }
      console.log("[PE:content] button shown - extension enabled");
    } else {
      // Extension is disabled - hide/remove button
      if (overlayRoot) {
        const host = overlayRoot.getRootNode().host;
        if (host) {
          host.style.display = "none";
          host.style.opacity = "0";
        }

        // Optionally unmount completely (uncomment if you want complete removal)
        // unmountOverlay();
      }
      console.log("[PE:content] button hidden - extension disabled");
    }
  }

  // Update button pulse animation based on input content
  function updateButtonPulse() {
    if (!enhanceBtn) return;
    
    const inputText = getInputValue();
    const hasInput = inputText.trim().length > 0;
    
    if (hasInput) {
      enhanceBtn.classList.add('pe-has-input');
    } else {
      enhanceBtn.classList.remove('pe-has-input');
    }
  }

  // Monitor input changes to update button pulse
  function setupInputMonitoring() {
    // Monitor input changes with a debounced function
    const debouncedUpdatePulse = debounce(updateButtonPulse, 200);
    
    // Set up observers for different input types
    const observer = new MutationObserver(() => {
      debouncedUpdatePulse();
    });
    
    // Observe document for any changes that might affect input
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      characterData: true 
    });
    
    // Also listen for specific input events
    document.addEventListener('input', debouncedUpdatePulse, true);
    document.addEventListener('keyup', debouncedUpdatePulse, true);
    document.addEventListener('paste', debouncedUpdatePulse, true);
    
    STATE.detachObservers.push(() => {
      observer.disconnect();
      document.removeEventListener('input', debouncedUpdatePulse, true);
      document.removeEventListener('keyup', debouncedUpdatePulse, true);
      document.removeEventListener('paste', debouncedUpdatePulse, true);
    });
    
    // Initial check
    setTimeout(debouncedUpdatePulse, 500);
  }

  // Build overlay UI in Shadow DOM with ChatGPT-native styling
  let shadowRoot;
  let overlayRoot;
  let enhanceBtn;
  let panel;
  let replaceBtn;
  let copyBtn;
  let cancelBtn;
  let statusEl;
  let improvedTextarea;

  function mountOverlay() {
    if (overlayRoot) return;
    console.log("[PE:content] mounting overlay");
    const host = document.createElement("div");
    host.id = "pe-overlay-host";
    host.style.position = "absolute";
    host.style.zIndex = "1000";
    host.style.pointerEvents = "none";
    document.documentElement.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });
    const container = document.createElement("div");

    // Use external CSS to avoid CSP violations
    container.innerHTML = `
      <link rel="stylesheet" href="${chrome.runtime.getURL(
        "content/overlay.css"
      )}">
      
      <div class="pe-root">
        <button class="pe-enhance-btn">
        </button>
        
        <div class="pe-panel pe-hidden" role="dialog" aria-label="Prompt Enhancer">
          <div class="pe-panel-header">
            <div class="pe-title">Enhanced Prompt</div>
            <div class="pe-status" aria-live="polite"></div>
          </div>
          
          <textarea 
            class="pe-output" 
            rows="6" 
            spellcheck="false" 
            placeholder="Your enhanced prompt will appear here..."
            aria-label="Enhanced prompt text"
          ></textarea>
          
          <div class="pe-actions">
            <button class="pe-action-btn pe-replace">
              Replace
            </button>
            <button class="pe-action-btn pe-copy">
              Copy
            </button>
            <button class="pe-action-btn pe-cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    shadowRoot.appendChild(container);

    overlayRoot = container;
    enhanceBtn = shadowRoot.querySelector(".pe-enhance-btn");
    panel = shadowRoot.querySelector(".pe-panel");
    replaceBtn = shadowRoot.querySelector(".pe-replace");
    copyBtn = shadowRoot.querySelector(".pe-copy");
    cancelBtn = shadowRoot.querySelector(".pe-cancel");
    statusEl = shadowRoot.querySelector(".pe-status");
    improvedTextarea = shadowRoot.querySelector(".pe-output");

    // Add all event listeners here instead of inline handlers
    enhanceBtn.addEventListener("click", onEnhanceClick);
    replaceBtn.addEventListener("click", onReplace);
    copyBtn.addEventListener("click", onCopy);
    cancelBtn.addEventListener("click", closePanel);

    // Make buttons unselectable to avoid focus issues
    [enhanceBtn, replaceBtn, copyBtn, cancelBtn].forEach((btn) => {
      btn.style.webkitUserSelect = "none";
      btn.style.userSelect = "none";
      btn.tabIndex = 0; // Make focusable with keyboard
    });

    // Close panel when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !panel.classList.contains("pe-hidden") &&
        !panel.contains(e.target) &&
        e.target !== enhanceBtn
      ) {
        closePanel();
      }
    });

    const observer = new ResizeObserver(debounce(positionOverlay, 100));
    observer.observe(document.documentElement);
    STATE.detachObservers.push(() => observer.disconnect());

    const mo = new MutationObserver(debounce(positionOverlay, 250));
    mo.observe(document.documentElement, { childList: true, subtree: true });
    STATE.detachObservers.push(() => mo.disconnect());

    // Set up input monitoring for pulse animation
    setupInputMonitoring();

    positionOverlay();
  }

  function unmountOverlay() {
    if (!overlayRoot) return;
    STATE.detachObservers.forEach((fn) => fn());
    STATE.detachObservers = [];
    overlayRoot.getRootNode().host?.remove();
    overlayRoot = null;
  }

  function getInputElement() {
    const chatgptSelectors = [
      "textarea[data-testid='prompt-textarea']",
      "form textarea",
      "textarea[placeholder*='Send a message']",
      "textarea:not([readonly])",
    ];
    const claudeSelectors = [
      "[contenteditable='true'][role='textbox']",
      "div[contenteditable='true']",
    ];
    const selectors =
      STATE.site === "ChatGPT" ? chatgptSelectors : claudeSelectors;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    const textareas = Array.from(
      document.querySelectorAll("textarea, [contenteditable='true']")
    );
    const candidates = textareas.filter(isVisible);
    if (candidates.length) {
      candidates.sort(
        (a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top
      );
      return candidates[0];
    }
    return null;
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
    );
  }

  function getConversationText() {
    let containers = [];
    if (STATE.site === "ChatGPT") {
      containers = [
        document.querySelector("main [data-testid='conversation-turns']"),
        document.querySelector("main [role='list']"),
        document.querySelector("main"),
      ].filter(Boolean);
    } else if (STATE.site === "Claude") {
      containers = [
        document.querySelector("main"),
        document.querySelector("[data-testid='conversation']"),
        document.body,
      ].filter(Boolean);
    } else {
      containers = [document.body];
    }

    const seen = new Set();
    const parts = [];
    for (const container of containers) {
      const items = container.querySelectorAll(
        "[data-testid='message'], article, [role='listitem'], [data-message-author-role], .markdown, p"
      );
      for (const node of items) {
        if (!isVisible(node)) continue;
        const text = node.innerText?.trim();
        if (!text || text.length < 2) continue;
        const key = text.slice(0, 40);
        if (seen.has(key)) continue;
        seen.add(key);
        parts.push(text);
      }
      if (parts.length > 0) break;
    }
    return parts.join("\n\n");
  }

  function getInputValue() {
    const el = getInputElement();
    if (!el) return "";
    if (el.tagName === "TEXTAREA") return el.value || "";
    if (el.getAttribute("contenteditable") === "true")
      return el.innerText || "";
    return "";
  }

  function setInputValue(text) {
    const el = getInputElement();
    if (!el) return false;
    if (el.tagName === "TEXTAREA") {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.focus();
      return true;
    }
    if (el.getAttribute("contenteditable") === "true") {
      el.focus();
      document.getSelection()?.removeAllRanges();
      el.innerHTML = "";
      el.textContent = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }

  function positionOverlay() {
    if (!overlayRoot) return;

    const host = overlayRoot.getRootNode().host;
    const input = getInputElement();

    if (!input) {
      host.style.display = "none";
      return;
    }

    host.style.display = "block";

    // Get input's bounding box
    const inputRect = input.getBoundingClientRect();

    // Position inside the input area (ChatGPT style)
    const rightOffset = 50; // Leave space for send button
    const topOffset = (inputRect.height - 32) / 2; // Center vertically in input

    host.style.position = "absolute";
    host.style.top = `${inputRect.top + window.scrollY + topOffset}px`;
    host.style.left = `${
      inputRect.right + window.scrollX - 110 - rightOffset
    }px`;
    host.style.width = "auto";
    host.style.height = "auto";

    // Ensure button stays within viewport
    const buttonRect = enhanceBtn?.getBoundingClientRect();
    if (buttonRect && buttonRect.right > window.innerWidth - 10) {
      host.style.left = `${window.innerWidth - 120 + window.scrollX}px`;
    }

    // Smart panel positioning to prevent overflow
    if (panel && !panel.classList.contains("pe-hidden")) {
      setTimeout(() => {
        positionPanel();
      }, 10);
    }
  }

  function positionPanel() {
    if (!panel || panel.classList.contains("pe-hidden")) return;

    const host = overlayRoot.getRootNode().host;
    const hostRect = host.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    
    // Reset panel position to default
    panel.style.position = "absolute";
    panel.style.bottom = "45px";
    panel.style.top = "auto";
    panel.style.right = "0";
    panel.style.left = "auto";

    // Check if panel overflows viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get updated panel rect after reset
    const updatedPanelRect = panel.getBoundingClientRect();
    
    // Horizontal overflow check
    if (updatedPanelRect.right > viewportWidth - 20) {
      // Panel overflows right, align to right edge of viewport
      const overflowAmount = updatedPanelRect.right - (viewportWidth - 20);
      panel.style.right = `-${overflowAmount}px`;
    }
    
    if (updatedPanelRect.left < 20) {
      // Panel overflows left, align to left edge
      panel.style.left = "20px";
      panel.style.right = "auto";
    }
    
    // Vertical overflow check
    if (updatedPanelRect.top < 20) {
      // Panel overflows top, position below button instead
      panel.style.bottom = "auto";
      panel.style.top = "45px";
    }
    
    // If panel is too tall for viewport, make it scrollable
    const maxHeight = viewportHeight - 100; // Leave some margin
    if (updatedPanelRect.height > maxHeight) {
      panel.style.maxHeight = `${maxHeight}px`;
      panel.style.overflowY = "auto";
    }
  }

  async function onEnhanceClick() {
    if (STATE.busy) return;

    // Check if extension is enabled
    if (!STATE.enabled) {
      console.log("[PE:content] Extension is disabled, ignoring enhance click");
      return;
    }

    // Check extension context before proceeding
    if (!chrome.runtime?.id) {
      setStatus("Extension needs reload");
      console.warn(
        "[PE:content] Extension context invalid, please reload page"
      );
      return;
    }

    await initSettings();
    if (!STATE.enabled) {
      openPanel();
      setStatus("Extension disabled");
      return;
    }

    // Check authentication before enhancing
    console.log("[PE:content] Checking authentication...");
    const authRes = await sendMessage({ type: "check-auth" });
    
    if (!authRes?.ok || !authRes.authenticated) {
      console.log("[PE:content] Authentication required");
      openPanel();
      setStatus("Please sign in to use enhancement");
      
      // Show authentication message in panel
      const messageArea = shadowRoot.querySelector('.pe-message');
      if (messageArea) {
        messageArea.innerHTML = `
          <div class="pe-auth-message">
            <div class="pe-auth-icon">🔐</div>
            <div class="pe-auth-text">
              <strong>Authentication Required</strong>
              <p>Please sign in to enhance prompts.</p>
              <button class="pe-auth-btn" onclick="chrome.runtime.sendMessage({type: 'require-auth'})">
                Sign In
              </button>
            </div>
          </div>
        `;
      }
      return;
    }

    console.log("[PE:content] User authenticated:", authRes.user?.email);

    const inputText = getInputValue();
    const conversationText = getConversationText();

    if (!inputText.trim() && !conversationText.trim()) {
      openPanel();
      setStatus("Nothing to enhance");
      return;
    }

    STATE.busy = true;
    enhanceBtn.classList.add("pe-busy");
    enhanceBtn.disabled = true;
    openPanel();
    setStatus("Enhancing…");
    console.log("[PE:content] sending enhance-prompt");

    try {
      const res = await sendMessage({
        type: "enhance-prompt",
        site: STATE.site,
        conversationText,
        inputText,
      });

      if (!res?.ok) throw new Error(res?.error || "Enhancement failed");

      STATE.lastImproved = res.improved || "";
      improvedTextarea.value = STATE.lastImproved;
      setStatus("Ready");

      // Focus the textarea for easy editing
      setTimeout(() => {
        improvedTextarea.focus();
        improvedTextarea.setSelectionRange(
          improvedTextarea.value.length,
          improvedTextarea.value.length
        );
      }, 100);

      console.log("[PE:content] enhancement received");
    } catch (e) {
      console.warn("[PE:content] enhance failed", e);
      setStatus(e?.message || "Enhancement failed");
    } finally {
      STATE.busy = false;
      enhanceBtn.classList.remove("pe-busy");
      enhanceBtn.disabled = false;
    }
  }

  function openPanel() {
    panel.classList.remove("pe-hidden");
    // Position panel after it becomes visible
    setTimeout(() => {
      positionPanel();
      improvedTextarea.focus();
    }, 50);
  }

  function closePanel() {
    panel.classList.add("pe-hidden");
    setStatus("");
  }

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  async function onReplace() {
    const text = improvedTextarea.value || STATE.lastImproved || "";
    if (!text.trim()) return;

    const success = setInputValue(text);
    if (success) {
      closePanel();
      enhanceBtn.classList.add("pe-flash");
      setTimeout(() => enhanceBtn.classList.remove("pe-flash"), 500);
      console.log("[PE:content] input replaced");
    } else {
      setStatus("Failed to replace text");
    }
  }

  async function onCopy() {
    const text = improvedTextarea.value || STATE.lastImproved || "";
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied!");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Copy failed");
    }
  }

  // Keyboard shortcut trigger
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "trigger-enhance") {
      console.log("[PE:content] trigger-enhance");
      onEnhanceClick();
    } else if (msg?.type === "settings-updated") {
      console.log("[PE:content] settings updated, refreshing state");
      initSettings(); // Refresh settings and update button visibility
    }
  });

  // Initialize: ping background to wake it, load settings, mount overlay, and watch DOM
  (async function boot() {
    const ping = await sendMessage({ type: "ping" });
    console.log("[PE:content] ping background:", ping?.ok);

    // Initialize settings first to determine if we should show the button
    await initSettings();

    // Only mount overlay if extension is enabled
    if (STATE.enabled) {
      mountOverlay();
      const mo = new MutationObserver(debounce(positionOverlay, 300));
      mo.observe(document.body, { childList: true, subtree: true });
      STATE.detachObservers.push(() => mo.disconnect());
    } else {
      console.log("[PE:content] Extension disabled, not mounting overlay");
    }
  })();

  window.addEventListener("unload", () => {
    try {
      unmountOverlay();
    } catch {}
  });
})();
