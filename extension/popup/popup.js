// Chrome API is available globally in extension contexts

const DEFAULTS = {
  enabled: true,
  provider: "openai",
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20240620",
  tone: "neutral",
  detail: "balanced",
  audience: "",
};

function sendMessage(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => resolve(res));
    } catch (e) {
      console.warn("[PE:popup] sendMessage error:", e);
      resolve({ ok: false });
    }
  });
}

// Authentication UI functions
function showAuthRequired() {
  console.log("[PE:popup] Showing authentication required UI");

  const container = document.querySelector(".container");
  if (!container) return;

  container.innerHTML = `
    <div class="auth-container">
      <header class="header">
        <div class="header-icon">PE</div>
        <h1 class="header-title">Prompt Enhancer</h1>
      </header>
      
      <div class="auth-card">
        <div class="auth-icon">🔐</div>
        <h2 class="auth-title">Authentication Required</h2>
        <p class="auth-description">
          Please sign in to use Prompt Enhancer. You'll get access to:
        </p>
        
        <ul class="auth-features">
          <li>✨ AI-powered prompt enhancement</li>
          <li>📊 Usage tracking and history</li>
          <li>⚙️ Customizable settings</li>
          <li>🔑 Personal API key management</li>
        </ul>
        
        <button class="btn btn-primary auth-btn" id="signInBtn">
          Sign In
        </button>
        
        <div class="auth-footer">
          <a href="#" id="retryAuthBtn" class="retry-link">Check Again</a>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  const signInBtn = document.getElementById("signInBtn");
  const retryAuthBtn = document.getElementById("retryAuthBtn");

  if (signInBtn) {
    signInBtn.addEventListener("click", async () => {
      console.log("[PE:popup] Sign in button clicked");
      const response = await sendMessage({ type: "require-auth" });
      if (response?.ok) {
        // Close popup after opening auth page
        window.close();
      }
    });
  }

  if (retryAuthBtn) {
    retryAuthBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      console.log("[PE:popup] Retry auth button clicked");
      await checkAuthAndInit();
    });
  }
}

function showLoadingState() {
  const container = document.querySelector(".container");
  if (!container) return;

  container.innerHTML = `
    <div class="loading-container">
      <header class="header">
        <div class="header-icon">PE</div>
        <h1 class="header-title">Prompt Enhancer</h1>
      </header>
      
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <div class="loading-text">Checking authentication...</div>
      </div>
    </div>
  `;
}

async function checkAuthAndInit() {
  try {
    showLoadingState();

    console.log("[PE:popup] Checking authentication...");
    const authResponse = await sendMessage({ type: "check-auth" });

    if (!authResponse?.ok) {
      console.error("[PE:popup] Auth check failed:", authResponse);
      showAuthRequired();
      return;
    }

    if (!authResponse.authenticated) {
      console.log("[PE:popup] User not authenticated");
      showAuthRequired();
      return;
    }

    console.log("[PE:popup] User authenticated:", authResponse.user?.email);
    // Restore original content and initialize normally
    await restoreOriginalUI();
    await init();
  } catch (error) {
    console.error("[PE:popup] Auth check error:", error);
    showAuthRequired();
  }
}

async function restoreOriginalUI() {
  // Restore the original HTML structure
  const container = document.querySelector(".container");
  if (!container) return;

  // Get user data
  const userResponse = await sendMessage({ type: "get-user" });
  const user = userResponse?.ok ? userResponse.user : null;
  const firstName = user?.firstName || "there";

  container.innerHTML = `
    <!-- Header -->
    <header class="header">
      <div class="header-icon">PE</div>
      <h1 class="header-title">Prompt Enhancer</h1>
    </header>

    <!-- Welcome Message -->
    <div class="welcome-message">
      <span class="welcome-text">👋 Welcome, ${firstName}!</span>
      <span class="plan-badge">${user?.plan?.displayName || "Free"}</span>
    </div>

    <!-- Status Card -->
    <div class="status-card">
      <div class="status-info">
        <div class="status-indicator" id="statusIndicator"></div>
        <span class="status-text" id="statusText">Extension Active</span>
      </div>
      <div class="toggle-switch active" id="toggleSwitch"></div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      <button class="btn btn-primary" id="settingsBtn">
        <span>⚙️</span>
        Settings
      </button>
      <button class="btn btn-secondary" id="historyBtn">
        <span>📊</span>
        History
      </button>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <div class="stat-item">
        <div class="stat-number" id="enhancementsCount">0</div>
        <div class="stat-label">Enhanced</div>
      </div>
      <div class="stat-item">
        <div class="stat-number" id="quotaRemaining">--</div>
        <div class="stat-label">Quota Left</div>
      </div>
    </div>

    <!-- Keyboard Shortcut Info -->
    <div class="shortcut-info">
      <span class="shortcut-text">💡 Use keyboard shortcut for quick enhancement</span>
      <a href="#" class="shortcut-link" id="shortcutsLink">Configure</a>
    </div>

    <!-- Recent History -->
    <section>
      <h2 class="section-title">
        <span>🔄</span>
        Recent Enhancements
      </h2>
      <div class="history-container">
        <div id="historyList">
          <div class="empty-state">
            <div class="empty-icon">💭</div>
            <div>No enhancements yet</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

async function init() {
  console.log("[PE:popup] Initializing popup");

  // Use the correct element IDs from the new HTML structure
  const toggleSwitch = document.getElementById("toggleSwitch");
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");
  const settingsBtn = document.getElementById("settingsBtn");
  const historyBtn = document.getElementById("historyBtn");
  const shortcutsLink = document.getElementById("shortcutsLink");
  const historyList = document.getElementById("historyList");
  const enhancementsCount = document.getElementById("enhancementsCount");
  const quotaRemaining = document.getElementById("quotaRemaining");

  if (!toggleSwitch) {
    console.error("[PE:popup] Toggle switch element not found");
    return;
  }

  try {
    const settingsRes = await sendMessage({ type: "get-settings" });
    if (settingsRes?.ok) {
      const isEnabled = !!settingsRes.settings.enabled;

      // Update toggle switch and status indicator
      updateExtensionStatus(
        isEnabled,
        toggleSwitch,
        statusText,
        statusIndicator
      );
    }

    // Toggle switch click handler
    toggleSwitch.addEventListener("click", async () => {
      const enabled = !toggleSwitch.classList.contains("active");
      console.log("[PE:popup] toggle enabled:", enabled);
      const currentRes = await sendMessage({ type: "get-settings" });
      if (currentRes?.ok) {
        const updated = { ...currentRes.settings, enabled };
        await sendMessage({ type: "set-settings", settings: updated });

        // Update UI
        updateExtensionStatus(
          enabled,
          toggleSwitch,
          statusText,
          statusIndicator
        );

        // Notify all content scripts about the settings change
        try {
          const tabs = await chrome.tabs.query({});
          for (const tab of tabs) {
            if (
              tab.url &&
              (tab.url.includes("chat.openai.com") ||
                tab.url.includes("chatgpt.com") ||
                tab.url.includes("claude.ai"))
            ) {
              chrome.tabs
                .sendMessage(tab.id, { type: "settings-updated" })
                .catch(() => {
                  // Ignore errors for tabs without content script
                });
            }
          }
        } catch (error) {
          console.warn("[PE:popup] Failed to notify content scripts:", error);
        }
      }
    });

    // Settings button
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        console.log("[PE:popup] Opening options page");
        try {
          if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
          } else {
            const url = chrome.runtime.getURL("options/options.html");
            chrome.tabs.create({ url });
          }
        } catch (error) {
          console.error("[PE:popup] Failed to open options:", error);
          try {
            const url = chrome.runtime.getURL("options/options.html");
            chrome.tabs.create({ url });
          } catch (fallbackError) {
            console.error("[PE:popup] Fallback also failed:", fallbackError);
          }
        }
      });
    }

    // History button - toggle history visibility
    if (historyBtn) {
      historyBtn.addEventListener("click", () => {
        console.log("[PE:popup] History button clicked");
        const historySection = document.querySelector("section");
        if (historySection) {
          const isHidden = historySection.style.display === "none";
          historySection.style.display = isHidden ? "block" : "none";
          historyBtn.textContent = isHidden
            ? "📊 Hide History"
            : "📊 Show History";

          if (isHidden) {
            // Refresh history when showing
            loadHistory();
          }
        }
      });
    }

    // Shortcuts link
    if (shortcutsLink) {
      shortcutsLink.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      });
    }

    // Load initial data
    await loadHistory();
    await loadStats();
    } catch (e) {
    console.warn("[PE:popup] init error:", e);
  }
}

// Helper function to update extension status UI
function updateExtensionStatus(
  isEnabled,
  toggleSwitch,
  statusText,
  statusIndicator
) {
  if (isEnabled) {
    toggleSwitch.classList.add("active");
    if (statusText) statusText.textContent = "Extension Active";
    if (statusIndicator) {
      statusIndicator.className = "status-indicator active";
      statusIndicator.style.backgroundColor = "#10b981"; // Green
    }
  } else {
    toggleSwitch.classList.remove("active");
    if (statusText) statusText.textContent = "Extension Disabled";
    if (statusIndicator) {
      statusIndicator.className = "status-indicator";
      statusIndicator.style.backgroundColor = "#ef4444"; // Red
    }
  }
}

// Load and display history from API via background script
async function loadHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  try {
    // Get user data first to ensure we're authenticated
    const userResponse = await sendMessage({ type: "get-user" });
    if (!userResponse?.ok || !userResponse.authenticated) {
      throw new Error("Not authenticated");
    }

    // Try to get enhanced usage data first (which includes history)
    let historyItems = [];
    
    try {
      const enhancedResponse = await sendMessage({ type: "get-enhanced-usage" });
      if (enhancedResponse?.ok && enhancedResponse.data?.historyItems) {
        historyItems = enhancedResponse.data.historyItems;
        console.log("[PE:popup] Using history from enhanced response:", historyItems.length);
      }
    } catch (enhancedError) {
      console.log("[PE:popup] Enhanced response failed, trying direct history...");
    }

    // Fallback to direct history API if enhanced response didn't work
    if (historyItems.length === 0) {
      const historyResponse = await sendMessage({ type: "get-api-history" });
      
      if (!historyResponse?.ok) {
        throw new Error(historyResponse?.error || "Failed to load history");
      }

      console.log("[PE:popup] Direct history response:", historyResponse.data);

      // Ensure we have an array of items, default to empty array if not
      historyItems = Array.isArray(historyResponse.data) 
        ? historyResponse.data 
        : Array.isArray(historyResponse.data?.items) 
        ? historyResponse.data.items 
        : [];
    }
    
    const items = historyItems.slice(0, 10); // Show latest 10
    
    console.log("[PE:popup] Final processed items:", items.length, items);

    if (items.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💭</div>
          <div>No enhancements yet</div>
          <div class="error-details">Start enhancing prompts to see your history here</div>
        </div>
      `;
      return;
    }

    historyList.innerHTML = items
      .map(
        (item, i) => `
        <div class="history-item" data-index="${i}" title="Click to copy enhanced prompt">
          <div class="history-content">
            <div class="history-meta">
              <span class="history-badge ${item.provider || "openai"}">${
          item.provider || "openai"
        }</span>
              <span class="history-site">${item.site || "Unknown"}</span>
              <span class="history-time">${formatRelativeTime(
                new Date(item.createdAt).getTime()
              )}</span>
            </div>
            <div class="history-label">Original:</div>
            <div class="history-text">${truncate(
              item.originalText || "Original prompt",
              100
            )}</div>
            <div class="history-label">Enhanced:</div>
            <div class="history-text enhanced">${truncate(
              item.enhancedText || "Enhanced prompt",
              100
            )}</div>
            <div class="history-stats">
              <span title="Processing time">⚡ ${
                item.processingTime || 0
              }ms</span>
              <span title="Tokens used">🔤 ${item.tokens || 0} tokens</span>
              ${item.requestType ? `<span title="Request type" class="request-type-${item.requestType}">
                ${item.requestType === 'personal' ? '🔑 Personal' : '🆓 Free'}
              </span>` : ''}
            </div>
          </div>
        </div>
      `
      )
      .join("");

    // Add click handlers for history items
    historyList.querySelectorAll(".history-item").forEach((el, index) => {
      el.addEventListener("click", async () => {
        const item = items[index];
        if (item && item.enhancedText) {
          const success = await copyToClipboard(item.enhancedText);
          if (success) {
            showToast("✅ Enhanced prompt copied to clipboard");
            // Visual feedback
            el.style.backgroundColor = "#f0f9ff";
            setTimeout(() => {
              el.style.backgroundColor = "";
            }, 1000);
          } else {
            showToast("❌ Failed to copy to clipboard");
          }
        }
      });
    });
  } catch (error) {
    console.warn("[PE:popup] Failed to load history:", error);
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <div>Failed to load history</div>
        <div class="error-details">${error.message}</div>
      </div>
    `;
  }
}

// Update stats to use enhanced API data
async function loadStats() {
  const enhancementsCount = document.getElementById("enhancementsCount");
  const quotaRemaining = document.getElementById("quotaRemaining");

  try {
    // Get user data first
    const userResponse = await sendMessage({ type: "get-user" });
    if (!userResponse?.ok || !userResponse.authenticated) {
      throw new Error("Not authenticated");
    }

    // Get enhanced usage data (combines history + quota + enhanced analytics)
    const enhancedResponse = await sendMessage({ type: "get-enhanced-usage" });

    if (!enhancedResponse?.ok) {
      throw new Error("Failed to load usage data");
    }

    console.log("[PE:popup] Enhanced response:", enhancedResponse.data);

    const { enhancedUsage, quotaInfo, historyItems } = enhancedResponse.data;

    console.log("[PE:popup] Enhanced usage breakdown:", enhancedUsage);
    console.log("[PE:popup] Quota info:", quotaInfo);

    // Update total enhancements count
    if (enhancementsCount) {
      const totalToday = enhancedUsage.totalDailyUsage || 0;
      enhancementsCount.textContent = totalToday.toString();
    }

    // Update quota display with smart logic
    if (quotaRemaining) {
      updateQuotaDisplay(quotaRemaining, enhancedUsage, quotaInfo);
    }

    // Update the status indicator with enhanced info
    updateStatusIndicator(enhancedUsage, quotaInfo);

  } catch (error) {
    console.warn("[PE:popup] Failed to load stats:", error);
    if (enhancementsCount) enhancementsCount.textContent = "0";
    if (quotaRemaining) {
      quotaRemaining.textContent = "--";
      quotaRemaining.title = "Failed to load usage information";
    }
    
    // Fallback to old method if enhanced usage fails
    try {
      console.log("[PE:popup] Trying fallback quota method...");
      const quotaResponse = await sendMessage({ type: "get-api-quota" });
      if (quotaResponse?.ok && quotaRemaining) {
        const quotaData = quotaResponse.data;
        quotaRemaining.textContent = quotaData.isUnlimited ? "∞" : (quotaData.dailyRemaining || 0).toString();
      }
    } catch (fallbackError) {
      console.warn("[PE:popup] Fallback also failed:", fallbackError);
    }
  }
}

// Enhanced quota display logic
function updateQuotaDisplay(quotaElement, enhancedUsage, quotaData) {
  const { hasPersonalApiKeys, freeUsage, personalUsage } = enhancedUsage;
  const { dailyRemaining, isUnlimited } = quotaData;

  if (hasPersonalApiKeys && personalUsage?.dailyUsed > 0) {
    // User has used personal API today
    quotaElement.textContent = "∞";
    quotaElement.title = `Using Personal API Keys\n${personalUsage.dailyUsed} personal enhancements today\nNo limits with your own API keys`;
  } else if (isUnlimited) {
    // User has unlimited plan
    quotaElement.textContent = "∞";
    quotaElement.title = "Unlimited plan - no quota restrictions";
  } else {
    // Show free quota remaining
    const remaining = dailyRemaining || 0;
    quotaElement.textContent = formatNumber(remaining);

    const freeDaily = freeUsage?.dailyUsed || 0;
    const dailyLimit = quotaData.dailyLimit || 10;
    quotaElement.title = `Free Quota: ${freeDaily}/${dailyLimit} used today\n${remaining} requests remaining`;
  }
}

// Update status indicator with enhanced information
function updateStatusIndicator(enhancedUsage, quotaData) {
  const statusText = document.getElementById("statusText");
  const statusIndicator = document.getElementById("statusIndicator");

  if (!statusText || !statusIndicator) return;

  const { hasPersonalApiKeys, freeUsage, personalUsage } = enhancedUsage;
  const personalToday = personalUsage?.dailyUsed || 0;
  const freeToday = freeUsage?.dailyUsed || 0;

  let statusMessage = "";
  let statusClass = "";
  let statusColor = "";

  if (hasPersonalApiKeys && personalToday > 0) {
    // User is actively using personal API
    statusMessage = `Using Personal API • ${personalToday} today`;
    statusClass = "personal-api";
    statusColor = "#6366f1"; // Blue for personal
  } else if (hasPersonalApiKeys) {
    // User has personal API but hasn't used it today
    statusMessage = "Personal API Ready • Unlimited";
    statusClass = "personal-ready";
    statusColor = "#10b981"; // Green for ready
  } else if (freeToday > 0) {
    // User is using free quota
    const remaining = quotaData.dailyRemaining || 0;
    if (remaining <= 0) {
      statusMessage = "Free Quota Exhausted";
      statusClass = "quota-exhausted";
      statusColor = "#ef4444"; // Red for exhausted
    } else if (remaining <= 2) {
      statusMessage = `Free Quota Low • ${remaining} left`;
      statusClass = "quota-low";
      statusColor = "#f59e0b"; // Orange for low
    } else {
      statusMessage = `Free Quota • ${remaining} left`;
      statusClass = "quota-active";
      statusColor = "#10b981"; // Green for active
    }
  } else {
    // Default state
    statusMessage = "Extension Active";
    statusClass = "active";
    statusColor = "#10b981"; // Green for active
  }

  statusText.textContent = statusMessage;
  statusIndicator.style.backgroundColor = statusColor;
  statusIndicator.className = `status-indicator ${statusClass}`;
}

// Format numbers for display
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || "";
  return text.slice(0, maxLen) + "...";
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Unknown";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.warn("[PE:popup] clipboard error:", e);
    return false;
  }
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(toast);

  setTimeout(() => (toast.style.opacity = "1"), 10);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", checkAuthAndInit);
