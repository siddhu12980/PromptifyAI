// Options page script for Prompt Enhancer Extension
// Handles API key configuration and settings management

// Default settings matching background script
const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openai", // "openai" or "anthropic"
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20240620",
  tone: "neutral", // neutral, professional, friendly, creative, persuasive, academic
  detail: "balanced", // concise, balanced, exhaustive
  audience: "", // empty string for general audience
};

// Chrome API is available globally in extension contexts

// Messaging helper
function sendMessage(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => resolve(res));
    } catch (e) {
      console.warn("[PE:options] sendMessage error:", e);
      resolve({ ok: false });
    }
  });
}

// Authentication check
async function checkAuthentication() {
  console.log("[PE:options] Checking authentication...");
  const authResponse = await sendMessage({ type: "check-auth" });
  return authResponse?.ok && authResponse.authenticated;
}

// Show authentication required state
function showAuthRequired() {
  const container = document.querySelector(".container");
  if (!container) return;

  container.innerHTML = `
    <div class="auth-container">
      <header class="header">
        <div class="header-icon">PE</div>
        <div class="header-content">
          <h1 class="header-title">Prompt Enhancer Settings</h1>
          <p class="header-subtitle">Authentication Required</p>
        </div>
      </header>
      
      <div class="card">
        <div class="card-content">
          <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
            <h2 style="margin-bottom: 16px;">Please Sign In</h2>
            <p style="margin-bottom: 24px; color: var(--text-muted);">
              You need to be signed in to access your settings and API keys.
            </p>
            <button class="btn btn-primary" id="signInBtn">
              Sign In to Continue
            </button>
            <div style="margin-top: 16px;">
              <a href="#" id="retryAuthBtn" style="color: var(--accent-primary); text-decoration: none;">
                Check Again
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  const signInBtn = document.getElementById("signInBtn");
  const retryAuthBtn = document.getElementById("retryAuthBtn");

  if (signInBtn) {
    signInBtn.addEventListener("click", async () => {
      const response = await sendMessage({ type: "require-auth" });
      if (response?.ok) {
        window.close();
      }
    });
  }

  if (retryAuthBtn) {
    retryAuthBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const isAuth = await checkAuthentication();
      if (isAuth) {
        await init();
      }
    });
  }
}

// Load settings from API
async function loadSettings() {
  console.log("[PE:options] Loading settings from API...");
  const res = await sendMessage({ type: "get-api-settings" });
  if (res?.ok && res.data?.settings) {
    console.log("[PE:options] Settings loaded from API:", res.data.settings);
    return res.data.settings;
  }

  // Fallback to local settings
  console.warn("[PE:options] Failed to load from API, trying local storage");
  const localRes = await sendMessage({ type: "get-settings" });
  if (localRes?.ok) {
    return localRes.settings;
  }

  console.warn("[PE:options] Failed to load settings, using defaults");
  return DEFAULT_SETTINGS;
}

// Save settings via API
async function saveSettings(settings) {
  console.log("[PE:options] Saving settings to API:", settings);
  const res = await sendMessage({ type: "set-api-settings", settings });
  if (res?.ok) {
    return true;
  }

  // Fallback to local storage
  console.warn("[PE:options] Failed to save to API, trying local storage");
  const localRes = await sendMessage({ type: "set-settings", settings });
  return localRes?.ok;
}

// Load API keys from API
async function loadApiKeys() {
  console.log("[PE:options] Loading API keys from API...");
  const res = await sendMessage({ type: "get-api-keys" });
  if (res?.ok) {
    console.log("[PE:options] API keys loaded");
    return res.apiKeys;
  }
  console.warn("[PE:options] Failed to load API keys");
  return { openaiKey: "", anthropicKey: "" };
}

// Save API keys via API
async function saveApiKeys(apiKeys) {
  console.log("[PE:options] Saving API keys to API...");
  const res = await sendMessage({ type: "set-api-keys", apiKeys });
  return res?.ok;
}

// Load enhancement history for stats (now uses API)
async function loadHistory() {
  console.log("[PE:options] Loading history from API...");
  const res = await sendMessage({ type: "get-api-history" });
  if (res?.ok) {
    // Handle nested data structure
    const historyItems = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.items)
      ? res.data.items
      : [];
    return historyItems;
  }

  // Fallback to local history
  const localRes = await sendMessage({ type: "get-history" });
  return localRes?.ok ? localRes.history || [] : [];
}

// Load quota information (now uses API)
async function loadQuotaInfo() {
  console.log("[PE:options] Loading quota info from API...");
  const res = await sendMessage({ type: "get-api-quota" });
  if (res?.ok && res.data) {
    return {
      provider: "api",
      month: new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      used: res.data.dailyUsed || 0,
      dailyUsed: res.data.dailyUsed || 0,
      dailyTotal: res.data.dailyLimit || 10,
      total: res.data.dailyLimit || 10,
      remaining: res.data.dailyRemaining || 0,
      monthlyUsed: res.data.monthlyUsed || 0,
      monthlyTotal: res.data.monthlyLimit || 200,
      hasPersonalKey: res.data.isUnlimited || false,
      isUnlimited: res.data.isUnlimited || false,
      freeUsage: res.data.freeUsage || {}, // Assuming freeUsage is part of the quota info
      personalUsage: res.data.personalUsage || {}, // Assuming personalUsage is part of the quota info
      dailyRemaining: res.data.dailyRemaining || 0, // Assuming dailyRemaining is part of the quota info
      hasPersonalApiKeys: res.data.hasPersonalApiKeys || false, // Assuming hasPersonalApiKeys is part of the quota info
    };
  }

  // Fallback to mock data if quota info unavailable
  return {
    provider: "openai",
    month: new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    used: 0,
    total: 10,
    remaining: 10,
    hasPersonalKey: false,
    isUnlimited: false,
    freeUsage: {},
    personalUsage: {},
    dailyRemaining: 0,
    hasPersonalApiKeys: false,
  };
}

// Update status badge based on extension state
function updateStatusBadge(enabled) {
  const statusBadge = document.getElementById("statusBadge");
  if (statusBadge) {
    statusBadge.textContent = enabled ? "Active" : "Disabled";
    statusBadge.className = enabled ? "status-badge" : "status-badge disabled";
    statusBadge.style.background = enabled
      ? "var(--success-color)"
      : "var(--text-muted)";
  }
}

// Update toggle switch appearance
function updateToggleSwitch(enabled) {
  const toggleSwitch = document.getElementById("enabledToggle");
  const checkbox = document.getElementById("enabled");

  if (toggleSwitch && checkbox) {
    checkbox.checked = enabled;
    if (enabled) {
      toggleSwitch.classList.add("active");
    } else {
      toggleSwitch.classList.remove("active");
    }
  }
}

// Update stats display with enhanced UI
function updateStats(history, quotaInfo) {
  // Update top overview stats
  const totalEnhancements =
    (quotaInfo.freeUsage?.dailyUsed || 0) +
    (quotaInfo.personalUsage?.dailyUsed || 0);
  const freeRemaining = quotaInfo.dailyRemaining || 0;

  const enhancementsTotal = document.getElementById("enhancementsTotal");
  const quotaStatus = document.getElementById("quotaStatus");

  if (enhancementsTotal) {
    enhancementsTotal.textContent = totalEnhancements.toString();
  }

  if (quotaStatus) {
    if (quotaInfo.hasPersonalApiKeys && quotaInfo.isUnlimited) {
      quotaStatus.textContent = "∞";
    } else {
      quotaStatus.textContent = freeRemaining.toString();
    }
  }
}

// Update enhanced quota display
function updateQuotaDisplay(quotaInfo, hasPersonalKey) {
  updateFreeUsageSection(quotaInfo);
  updatePersonalUsageSection(quotaInfo);
}

// Update free usage section
function updateFreeUsageSection(quotaInfo) {
  const freeDaily = quotaInfo.freeUsage?.dailyUsed || 0;
  const freeMonthly = quotaInfo.freeUsage?.monthlyUsed || 0;
  const dailyLimit = quotaInfo.dailyLimit > 0 ? quotaInfo.dailyLimit : 10;
  const monthlyLimit =
    quotaInfo.monthlyLimit > 0 ? quotaInfo.monthlyLimit : 200;
  const dailyRemaining = Math.max(0, dailyLimit - freeDaily);
  const monthlyRemaining = Math.max(0, monthlyLimit - freeMonthly);

  // Update quota bar
  const quotaFill = document.getElementById("quotaFill");
  const quotaLabel = document.getElementById("quotaLabel");
  const freeBadge = document.getElementById("freeBadge");

  if (quotaFill) {
    const percentage = Math.min((freeDaily / dailyLimit) * 100, 100);
    quotaFill.style.width = `${percentage}%`;

    // Dynamic color based on usage
    if (percentage > 90) {
      quotaFill.style.background = "linear-gradient(90deg, #ef4444, #dc2626)";
    } else if (percentage > 75) {
      quotaFill.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    } else {
      quotaFill.style.background = "linear-gradient(90deg, #10b981, #059669)";
    }
  }

  if (quotaLabel) {
    quotaLabel.textContent = `${freeDaily} / ${dailyLimit}`;
  }

  if (freeBadge) {
    if (dailyRemaining === 0) {
      freeBadge.textContent = "Exhausted";
      freeBadge.className = "usage-badge empty-badge";
    } else if (dailyRemaining <= 2) {
      freeBadge.textContent = "Low";
      freeBadge.className = "usage-badge";
      freeBadge.style.background = "rgba(245, 158, 11, 0.1)";
      freeBadge.style.color = "#d97706";
      freeBadge.style.border = "1px solid rgba(245, 158, 11, 0.2)";
    } else {
      freeBadge.textContent = "Active";
      freeBadge.className = "usage-badge free-badge";
    }
  }

  // Update usage details
  const freeDailyUsage = document.getElementById("freeDailyUsage");
  const freeMonthlyUsage = document.getElementById("freeMonthlyUsage");

  if (freeDailyUsage) {
    freeDailyUsage.textContent = `${freeDaily} / ${dailyLimit}`;
  }

  if (freeMonthlyUsage) {
    freeMonthlyUsage.textContent = `${freeMonthly} / ${monthlyLimit}`;
  }
}

// Update personal usage section
function updatePersonalUsageSection(quotaInfo) {
  const personalDaily = quotaInfo.personalUsage?.dailyUsed || 0;
  const personalMonthly = quotaInfo.personalUsage?.monthlyUsed || 0;
  const personalCost = quotaInfo.personalUsage?.totalCost || 0;
  const hasPersonalKeys = quotaInfo.hasPersonalApiKeys;

  const personalSection = document.getElementById("personalUsageSection");
  const noKeysSection = document.getElementById("noPersonalKeysSection");

  if (hasPersonalKeys || personalDaily > 0 || personalMonthly > 0) {
    // Show personal usage section
    if (personalSection) personalSection.style.display = "block";
    if (noKeysSection) noKeysSection.style.display = "none";

    // Update personal stats
    const personalDailyCount = document.getElementById("personalDailyCount");
    const personalMonthlyCount = document.getElementById(
      "personalMonthlyCount"
    );
    const personalCostEl = document.getElementById("personalCost");
    const personalNote = document.getElementById("personalNote");

    if (personalDailyCount) {
      personalDailyCount.textContent = personalDaily.toString();
    }

    if (personalMonthlyCount) {
      personalMonthlyCount.textContent = personalMonthly.toString();
    }

    if (personalCostEl) {
      if (personalCost > 0) {
        personalCostEl.textContent = `$${personalCost.toFixed(4)}`;
      } else {
        personalCostEl.textContent = "$0.00";
      }
    }

    if (personalNote) {
      if (personalCost > 0) {
        personalNote.innerHTML = `💰 You've spent approximately $${personalCost.toFixed(
          4
        )} this month on API calls`;
      } else {
        personalNote.innerHTML =
          "💡 Using your own API keys - no quota limits apply";
      }
    }
  } else {
    // Show no keys section
    if (personalSection) personalSection.style.display = "none";
    if (noKeysSection) noKeysSection.style.display = "block";
  }
}

// Show status message to user
function showStatus(message, isError = false) {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `save-status ${isError ? "error" : "success"}`;
    setTimeout(() => {
      statusEl.textContent = "";
      statusEl.className = "save-status";
    }, 3000);
  }
}

// Reset all settings to defaults
async function resetSettings() {
  if (
    !confirm(
      "Are you sure you want to reset all settings to defaults? This will not delete your API keys."
    )
  ) {
    return;
  }

  try {
    const success = await saveSettings(DEFAULT_SETTINGS);
    if (success) {
      showStatus("Settings reset to defaults!");
      // Reload the page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showStatus("Failed to reset settings. Please try again.", true);
    }
  } catch (error) {
    console.error("[PE:options] Reset error:", error);
    showStatus("Error resetting settings: " + error.message, true);
  }
}

// Handle keyboard shortcuts link
function openShortcuts() {
  chrome.tabs.create({
    url: "chrome://extensions/shortcuts",
  });
}

// Handle support link
function openSupport() {
  chrome.tabs.create({
    url: "https://github.com/your-repo/issues",
  });
}

// Check if user has personal API keys
function hasPersonalApiKeys(apiKeys) {
  return !!(apiKeys.openaiKey?.trim() || apiKeys.anthropicKey?.trim());
}

// Render API key management UI
function renderApiKeySection(provider, keyInfo, containerElement) {
  if (!containerElement) return;

  const isOpenAI = provider === "openai";
  const providerName = isOpenAI ? "OpenAI" : "Anthropic";
  const keyFieldId = isOpenAI ? "openaiKey" : "anthropicKey";

  if (keyInfo && keyInfo.exists) {
    // Show existing key with edit/delete options
    containerElement.innerHTML = `
      <div class="api-key-existing">
        <div class="api-key-header">
          <div class="api-key-info">
            <span class="api-key-provider">${providerName}</span>
            <span class="api-key-status ${
              keyInfo.isValid ? "valid" : "invalid"
            }">
              ${keyInfo.isValid ? "✓ Valid" : "✗ Invalid"}
            </span>
          </div>
          <div class="api-key-actions">
            <button type="button" class="btn-icon btn-edit" title="Edit Key" data-provider="${provider}">
              <span>✏️</span>
            </button>
            <button type="button" class="btn-icon btn-delete" title="Delete Key" data-provider="${provider}">
              <span>🗑️</span>
            </button>
          </div>
        </div>
        <div class="api-key-details">
          <div class="api-key-masked">${keyInfo.masked}</div>
          <div class="api-key-meta">
            Last updated: ${new Date(keyInfo.lastUpdated).toLocaleDateString()}
            ${
              keyInfo.error
                ? `<span class="error-text"> • ${keyInfo.error}</span>`
                : ""
            }
          </div>
        </div>
        <div class="api-key-edit-form" style="display: none;">
          <input type="password" class="form-input" placeholder="Enter new ${providerName} API key" id="${keyFieldId}">
          <div class="api-key-edit-actions">
            <button type="button" class="btn btn-primary btn-save-key" data-provider="${provider}">
              Save
            </button>
            <button type="button" class="btn btn-secondary btn-cancel-edit" data-provider="${provider}">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Show add new key form
    containerElement.innerHTML = `
      <div class="api-key-empty">
        <div class="api-key-empty-content">
          <div class="api-key-empty-icon">🔑</div>
          <div class="api-key-empty-text">
            <strong>No ${providerName} API Key</strong>
            <p>Add your API key to enable ${providerName} features</p>
          </div>
        </div>
        <div class="api-key-add-form">
          <input type="password" class="form-input" placeholder="Enter ${providerName} API key" id="${keyFieldId}">
          <button type="button" class="btn btn-primary btn-add-key" data-provider="${provider}">
            Add Key
          </button>
        </div>
      </div>
    `;
  }

  // Add event listeners
  addApiKeyEventListeners(containerElement, provider);
}

// Add event listeners for API key management
function addApiKeyEventListeners(container, provider) {
  if (!container) return;

  const isOpenAI = provider === "openai";
  const keyFieldId = isOpenAI ? "openaiKey" : "anthropicKey";

  // Edit button
  const editBtn = container.querySelector(".btn-edit");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const editForm = container.querySelector(".api-key-edit-form");
      const keyDetails = container.querySelector(".api-key-details");
      const actions = container.querySelector(".api-key-actions");

      if (editForm && keyDetails && actions) {
        editForm.style.display = "block";
        keyDetails.style.display = "none";
        actions.style.opacity = "0.5";

        // Focus on input
        const input = editForm.querySelector(`#${keyFieldId}`);
        if (input) input.focus();
      }
    });
  }

  // Cancel edit button
  const cancelBtn = container.querySelector(".btn-cancel-edit");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      const editForm = container.querySelector(".api-key-edit-form");
      const keyDetails = container.querySelector(".api-key-details");
      const actions = container.querySelector(".api-key-actions");
      const input = container.querySelector(`#${keyFieldId}`);

      if (editForm && keyDetails && actions) {
        editForm.style.display = "none";
        keyDetails.style.display = "block";
        actions.style.opacity = "1";

        // Clear input
        if (input) input.value = "";
      }
    });
  }

  // Save key button (both edit and add)
  const saveBtn =
    container.querySelector(".btn-save-key") ||
    container.querySelector(".btn-add-key");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const input = container.querySelector(`#${keyFieldId}`);
      const apiKey = input?.value?.trim();

      if (!apiKey) {
        showStatus(
          `Please enter a valid ${
            provider === "openai" ? "OpenAI" : "Anthropic"
          } API key`,
          true
        );
        return;
      }

      try {
        // Show loading state
        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        // Save the API key
        const result = await saveApiKey(provider, apiKey);

        if (result) {
          showStatus(
            `${
              provider === "openai" ? "OpenAI" : "Anthropic"
            } API key saved successfully!`
          );

          // Reload the API keys to refresh the UI
          setTimeout(async () => {
            const updatedKeys = await loadApiKeys();
            renderApiKeysUI(updatedKeys);
          }, 1000);
        } else {
          showStatus(
            `Failed to save ${
              provider === "openai" ? "OpenAI" : "Anthropic"
            } API key`,
            true
          );
        }
      } catch (error) {
        console.error("Error saving API key:", error);
        showStatus(`Error saving API key: ${error.message}`, true);
      } finally {
        // Reset button state
        saveBtn.textContent = saveBtn.classList.contains("btn-add-key")
          ? "Add Key"
          : "Save";
        saveBtn.disabled = false;
      }
    });
  }

  // Delete button
  const deleteBtn = container.querySelector(".btn-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const providerName = provider === "openai" ? "OpenAI" : "Anthropic";

      if (
        !confirm(
          `Are you sure you want to delete your ${providerName} API key?\n\nThis action cannot be undone.`
        )
      ) {
        return;
      }

      try {
        // Show loading state
        deleteBtn.innerHTML = "<span>⏳</span>";
        deleteBtn.disabled = true;

        // Delete the API key
        const result = await deleteApiKey(provider);

        if (result) {
          showStatus(`${providerName} API key deleted successfully!`);

          // Reload the API keys to refresh the UI
          setTimeout(async () => {
            const updatedKeys = await loadApiKeys();
            renderApiKeysUI(updatedKeys);
          }, 1000);
        } else {
          showStatus(`Failed to delete ${providerName} API key`, true);
        }
      } catch (error) {
        console.error("Error deleting API key:", error);
        showStatus(`Error deleting API key: ${error.message}`, true);
      } finally {
        // Reset button state
        deleteBtn.innerHTML = "<span>🗑️</span>";
        deleteBtn.disabled = false;
      }
    });
  }
}

// Render the complete API keys UI
function renderApiKeysUI(apiKeys) {
  const openaiContainer = document.getElementById("openaiKeyContainer");
  const anthropicContainer = document.getElementById("anthropicKeyContainer");

  if (openaiContainer) {
    renderApiKeySection("openai", apiKeys.openaiKeyInfo, openaiContainer);
  }

  if (anthropicContainer) {
    renderApiKeySection(
      "anthropic",
      apiKeys.anthropicKeyInfo,
      anthropicContainer
    );
  }
}

// Save individual API key
async function saveApiKey(provider, apiKey) {
  console.log(`[PE:options] Saving ${provider} API key...`);

  // Only send the specific key being updated
  const apiKeys = {};
  if (provider === "openai") {
    apiKeys.openaiKey = apiKey;
  } else if (provider === "anthropic") {
    apiKeys.anthropicKey = apiKey;
  }

  console.log(`[PE:options] Sending API key update:`, { provider, hasKey: !!apiKey });

  const res = await sendMessage({ type: "set-api-keys", apiKeys });
  return res?.ok;
}

// Delete individual API key
async function deleteApiKey(provider) {
  console.log(`[PE:options] Deleting ${provider} API key...`);

  // Only send the specific key being deleted (as empty string)
  const apiKeys = {};
  if (provider === "openai") {
    apiKeys.openaiKey = "";
  } else if (provider === "anthropic") {
    apiKeys.anthropicKey = "";
  }

  console.log(`[PE:options] Sending deletion request:`, { provider });

  const res = await sendMessage({ type: "set-api-keys", apiKeys });
  return res?.ok;
}

// Initialize the options page
async function init() {
  console.log("[PE:options] Initializing options page...");

  try {
    // Check authentication first
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      showAuthRequired();
      return;
    }

    // Load current settings, API keys, and stats
    const [settings, apiKeys, history] = await Promise.all([
      loadSettings(),
      loadApiKeys(),
      loadHistory(),
    ]);

    const quotaInfo = await loadQuotaInfo();
    const hasPersonalKey = hasPersonalApiKeys(apiKeys);

    // Update status badge and toggle
    updateStatusBadge(settings.enabled);
    updateToggleSwitch(settings.enabled);

    // Populate form fields
    const providerEl = document.getElementById("provider");
    const openaiModelEl = document.getElementById("openaiModel");
    const anthropicModelEl = document.getElementById("anthropicModel");
    const toneEl = document.getElementById("tone");
    const detailEl = document.getElementById("detail");
    const audienceEl = document.getElementById("audience");

    if (providerEl) providerEl.value = settings.provider;
    if (openaiModelEl) openaiModelEl.value = settings.openaiModel;
    if (anthropicModelEl) anthropicModelEl.value = settings.anthropicModel;
    if (toneEl) toneEl.value = settings.tone;
    if (detailEl) detailEl.value = settings.detail;
    if (audienceEl) audienceEl.value = settings.audience || "";

    // Update stats and quota display
    updateStats(history, quotaInfo);
    updateQuotaDisplay(quotaInfo, hasPersonalKey);

    // Toggle switch handler
    const enabledCheckbox = document.getElementById("enabled");
    const enabledToggle = document.getElementById("enabledToggle");

    if (enabledToggle && enabledCheckbox) {
      enabledToggle.addEventListener("click", () => {
        const newState = !enabledCheckbox.checked;
        enabledCheckbox.checked = newState;
        updateStatusBadge(newState);
        updateToggleSwitch(newState);
      });
    }

    // Save button handler
    const saveBtn = document.getElementById("save");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        try {
          // Gather settings from form
          const newSettings = {
            enabled: document.getElementById("enabled")?.checked ?? true,
            provider: document.getElementById("provider")?.value ?? "openai",
            openaiModel:
              document.getElementById("openaiModel")?.value ?? "gpt-4o",
            anthropicModel:
              document.getElementById("anthropicModel")?.value ??
              "claude-3-5-sonnet-20240620",
            tone: document.getElementById("tone")?.value ?? "neutral",
            detail: document.getElementById("detail")?.value ?? "balanced",
            audience: document.getElementById("audience")?.value ?? "",
          };

          // Save settings (API keys are now managed separately)
          const settingsSaved = await saveSettings(newSettings);

          if (settingsSaved) {
            showStatus("Settings saved successfully!");

            // Update UI state
            updateStatusBadge(newSettings.enabled);
            updateToggleSwitch(newSettings.enabled);

            // Notify content scripts of settings change
            try {
              const tabs = await chrome.tabs.query({
                url: [
                  "*://chatgpt.com/*",
                  "*://chat.openai.com/*",
                  "*://claude.ai/*",
                ],
              });

              tabs.forEach((tab) => {
                chrome.tabs
                  .sendMessage(tab.id, { type: "settings-updated" })
                  .catch(() => {
                    // Tab might not have content script loaded, ignore error
                  });
              });
            } catch (e) {
              // Ignore tab messaging errors
              console.log(
                "[PE:options] Could not notify tabs of settings update"
              );
            }
          } else {
            showStatus("Failed to save settings. Please try again.", true);
          }
        } catch (error) {
          console.error("[PE:options] Save error:", error);
          showStatus("Error saving settings: " + error.message, true);
        }
      });
    }

    // Reset button handler
    const resetButton = document.getElementById("reset");
    if (resetButton) {
      resetButton.addEventListener("click", resetSettings);
    }

    // Footer link handlers
    const shortcutsLink = document.getElementById("shortcuts");
    if (shortcutsLink) {
      shortcutsLink.addEventListener("click", (e) => {
        e.preventDefault();
        openShortcuts();
      });
    }

    const supportLink = document.getElementById("support");
    if (supportLink) {
      supportLink.addEventListener("click", (e) => {
        e.preventDefault();
        openSupport();
      });
    }

    // Render API keys UI
    renderApiKeysUI(apiKeys);

    console.log("[PE:options] Options page initialized successfully");
  } catch (error) {
    console.error("[PE:options] Initialization error:", error);

    // Show a user-friendly error message
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = `
        <div class="auth-container">
          <header class="header">
            <div class="header-icon">PE</div>
            <div class="header-content">
              <h1 class="header-title">Prompt Enhancer Settings</h1>
              <p class="header-subtitle">Error Loading Settings</p>
            </div>
          </header>
          
          <div class="card">
            <div class="card-content">
              <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 16px;">Error Loading Settings</h2>
                <p style="margin-bottom: 24px; color: var(--text-muted);">
                  ${
                    error.message ||
                    "An unknown error occurred while loading your settings."
                  }
                </p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                  Retry
                </button>
                <div style="margin-top: 16px;">
                  <details style="margin-top: 16px; text-align: left;">
                    <summary style="cursor: pointer; color: var(--accent-primary);">
                      Technical Details
                    </summary>
                    <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; margin-top: 8px;">
${JSON.stringify({ error: error.message, stack: error.stack }, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Fallback if container doesn't exist
      document.body.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h1>Error Loading Settings</h1>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[PE:options] DOM loaded, starting initialization...");
  await init();
});
