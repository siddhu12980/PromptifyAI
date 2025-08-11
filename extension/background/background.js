// Chrome API is available globally in service workers

// ---------- Authentication Configuration ----------
const API_BASE_URL = "http://localhost:3000"; // TODO: Update to production URL
const AUTH_ROUTES = {
  userProfile: `${API_BASE_URL}/api/user`,
  authRedirect: `${API_BASE_URL}/`, // Main site for Clerk authentication
};

// Authentication state
let authState = {
  isAuthenticated: false,
  user: null,
  lastCheck: null,
  checkInterval: 5 * 60 * 1000, // Check every 5 minutes
};

// ---------- Authentication Functions ----------
async function checkAuthentication() {
  try {
    console.log("[PE:auth] Checking authentication status...");

    const response = await fetch(AUTH_ROUTES.userProfile, {
      method: "GET",
      credentials: "include", // Include cookies for Clerk auth
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        console.log("[PE:auth] User authenticated:", data.data.email);
        authState.isAuthenticated = true;
        authState.user = data.data;
        authState.lastCheck = Date.now();

        // Store user data for extension use
        await chrome.storage.sync.set({
          userProfile: data.data,
          authStatus: "authenticated",
          lastAuthCheck: authState.lastCheck,
        });

        return { authenticated: true, user: data.data };
      }
    }

    console.log(
      "[PE:auth] User not authenticated, response status:",
      response.status
    );
    authState.isAuthenticated = false;
    authState.user = null;

    // Clear stored auth data
    await chrome.storage.sync.remove(["userProfile", "authStatus"]);
    await chrome.storage.sync.set({ authStatus: "unauthenticated" });

    return { authenticated: false, redirectUrl: AUTH_ROUTES.authRedirect };
  } catch (error) {
    console.error("[PE:auth] Authentication check failed:", error);
    authState.isAuthenticated = false;
    authState.user = null;

    await chrome.storage.sync.set({ authStatus: "error" });
    return { authenticated: false, error: error.message };
  }
}

async function requireAuthentication() {
  const authResult = await checkAuthentication();

  if (!authResult.authenticated) {
    console.log(
      "[PE:auth] Authentication required, redirecting to:",
      AUTH_ROUTES.authRedirect
    );

    // Open auth page in new tab
    await chrome.tabs.create({
      url: AUTH_ROUTES.authRedirect,
      active: true,
    });

    return false;
  }

  return true;
}

async function getAuthenticatedUser() {
  if (authState.isAuthenticated && authState.user) {
    // Check if we need to refresh auth status
    const timeSinceCheck = Date.now() - (authState.lastCheck || 0);
    if (timeSinceCheck < authState.checkInterval) {
      return authState.user;
    }
  }

  const authResult = await checkAuthentication();
  return authResult.authenticated ? authResult.user : null;
}

// ---------- Boot logs to verify background is running ----------
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[PE:bg] onInstalled:", details.reason);
  // Check authentication on install
  checkAuthentication();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[PE:bg] onStartup service worker awake");
  // Check authentication on startup
  checkAuthentication();
  cleanupStorage();
});

// ---------- Defaults & Shared Key Quota ----------
const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openai",
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20240620",
  tone: "neutral",
  detail: "balanced",
  audience: "",
  maxHistoryItems: 10, // Reduced from 20 to save space
  enhancementMode: "smart", // "template", "ai", "smart" (auto-choose)
};

const STORAGE_KEYS = {
  settings: "settings",
  apiKeys: "apiKeys",
  history: "history",
};

// Enhanced Prompt Engineering System ----------
// All enhancement logic is now handled by the API server

// Helper function to extract topics from conversation (used in fallback)
function extractMainTopicFromContext(conversationText) {
  if (!conversationText) return null;

  // Simple extraction - get key nouns/topics from recent messages
  const words = conversationText
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const commonWords = new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "had",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "man",
    "new",
    "now",
    "old",
    "see",
    "two",
    "way",
    "who",
    "boy",
    "did",
    "its",
    "let",
    "put",
    "say",
    "she",
    "too",
    "use",
    "will",
    "with",
    "that",
    "this",
    "have",
    "from",
    "they",
    "know",
    "want",
    "been",
    "good",
    "much",
    "some",
    "time",
    "very",
    "when",
    "come",
    "here",
    "just",
    "like",
    "long",
    "make",
    "many",
    "over",
    "such",
    "take",
    "than",
    "them",
    "well",
    "were",
  ]);

  const keywords = words
    .filter((word) => !commonWords.has(word))
    .slice(-10) // Get last 10 relevant words
    .slice(0, 3); // Take first 3 of those

  return keywords.length > 0 ? keywords.join(", ") : null;
}

// ---------- Core enhancement with API integration ----------
async function enhancePromptWithProvider({
  site,
  conversationText,
  inputText,
}) {
  const settings = await getSettings();
  if (!settings.enabled) throw new Error("Extension is disabled.");

  // Check authentication first
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error(
      "Authentication required. Please sign in to use enhancement."
    );
  }

  console.log("[PE:bg] Using API enhancement for user:", user.email);

  try {
    // Call the enhance-prompt API endpoint
    const response = await fetch(`${API_BASE_URL}/api/enhance-prompt`, {
      method: "POST",
      credentials: "include", // Include cookies for Clerk auth
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalText: inputText || "",
        conversationContext: conversationText || "",
        site: site,
        settings: {
          provider: settings.provider,
          openaiModel: settings.openaiModel,
          anthropicModel: settings.anthropicModel,
          tone: settings.tone,
          detail: settings.detail,
          audience: settings.audience,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 401) {
        throw new Error("Authentication required. Please sign in to continue.");
      } else if (response.status === 429) {
        throw new Error(
          errorData?.message ||
            "Quota exceeded. Please try again later or add your personal API key for unlimited usage."
        );
      } else if (response.status === 400) {
        throw new Error(
          errorData?.message || "Invalid request. Please check your input."
        );
      } else if (response.status === 500) {
        throw new Error(
          errorData?.message ||
            "Enhancement service temporarily unavailable. Please try again."
        );
      }

      throw new Error(`Enhancement failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || data.error || "Enhancement failed");
    }

    const enhancedText = data.data.enhancedText;
    const tokensUsed = data.data.tokensUsed || 0;
    const quotaInfo = data.data.quotaInfo;

    // Add to local history for quick access (still useful for offline viewing)
    await addHistoryItem({
      site,
      inputPreview: (inputText || "").slice(0, 200),
      improvedPreview: enhancedText.slice(0, 200),
      method: "api",
      tokens: tokensUsed,
      quota: quotaInfo,
    });

    console.log("[PE:bg] API enhancement successful. Tokens used:", tokensUsed);

    return enhancedText;
  } catch (error) {
    console.error("[PE:bg] API enhancement failed:", error);

    // If API fails, provide fallback enhancement
    if (error.message?.includes("Authentication required")) {
      throw error; // Re-throw auth errors
    }

    // For other errors, try a simple fallback
    console.log("[PE:bg] Falling back to simple enhancement");

    let fallbackText = inputText || "";

    // Simple enhancement fallback
    if (fallbackText.trim()) {
      if (
        !fallbackText.toLowerCase().includes("explain") &&
        !fallbackText.includes("?") &&
        fallbackText.length < 50
      ) {
        fallbackText +=
          ". Please provide a detailed explanation with examples.";
      }

      // Add conversation context if available
      if (conversationText?.trim()) {
        const topic = extractMainTopicFromContext(conversationText);
        if (topic) {
          fallbackText += ` (Building on our discussion about ${topic})`;
        }
      }
  } else {
      fallbackText =
        "Please provide a comprehensive explanation with relevant examples and practical applications.";
    }

    // Add to history as fallback method
  await addHistoryItem({
    site,
      inputPreview: (inputText || "").slice(0, 200),
      improvedPreview: fallbackText.slice(0, 200),
      method: "fallback",
      error: error.message,
    });

    return fallbackText;
  }
}

// Add quota info handler
// ---------- Messaging with debug ----------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[PE:bg] onMessage:", message?.type, "from tab", sender?.tab?.id);
  (async () => {
    try {
      if (message?.type === "ping") {
        sendResponse({ ok: true });
        return;
      }

      // Authentication handlers
      if (message?.type === "check-auth") {
        const authResult = await checkAuthentication();
        sendResponse({
          ok: true,
          authenticated: authResult.authenticated,
          user: authResult.user,
          redirectUrl: authResult.redirectUrl,
          error: authResult.error,
        });
        return;
      }

      if (message?.type === "require-auth") {
        const isAuthenticated = await requireAuthentication();
        sendResponse({ ok: true, authenticated: isAuthenticated });
        return;
      }

      if (message?.type === "get-user") {
        const user = await getAuthenticatedUser();
        sendResponse({
          ok: true,
          user: user,
          authenticated: !!user,
        });
        return;
      }

      // For all other requests that need authentication, check first
      const protectedTypes = [
        "enhance-prompt",
        "get-api-keys",
        "set-api-keys",
        "get-api-history",
        "get-api-quota",
        "get-api-settings",
        "set-api-settings",
        "get-enhanced-usage",
      ];

      if (protectedTypes.includes(message?.type)) {
        const user = await getAuthenticatedUser();
        if (!user) {
          sendResponse({
            ok: false,
            error: "Authentication required",
            requireAuth: true,
          });
          return;
        }
      }

      // Legacy settings handlers (for backwards compatibility with local storage)
      if (message?.type === "get-settings") {
        const settings = await getSettings();
        sendResponse({ ok: true, settings });
        return;
      }
      if (message?.type === "set-settings") {
        const next = await setSettings(message.settings);
        sendResponse({ ok: true, settings: next });
        return;
      }

      // API-based settings handlers
      if (message?.type === "get-api-settings") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/setting`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to load settings");
          }

          sendResponse({
            ok: true,
            data: data.data,
          });
        } catch (error) {
          console.error("[PE:bg] Failed to fetch settings:", error);
          sendResponse({
            ok: false,
            error: error.message,
          });
        }
        return;
      }

      if (message?.type === "set-api-settings") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/setting`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              settings: message.settings,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to save settings");
          }

          sendResponse({
            ok: true,
            data: data.data,
          });
        } catch (error) {
          console.error("[PE:bg] Failed to save settings:", error);
          sendResponse({
            ok: false,
            error: error.message,
          });
        }
        return;
      }

      // API-based API key handlers (updated to use API)
      if (message?.type === "get-api-keys") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/api-keys`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to load API keys");
          }

          sendResponse({
            ok: true,
            apiKeys: data.data.apiKeys,
          });
        } catch (error) {
          console.error("[PE:bg] Failed to fetch API keys:", error);
          // Fallback to local storage for compatibility
          const keys = await getApiKeys();
          sendResponse({ ok: true, apiKeys: keys });
        }
        return;
      }

      if (message?.type === "set-api-keys") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/api-keys`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              apiKeys: message.apiKeys,
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to save API keys");
          }

          sendResponse({
            ok: true,
            data: data.data,
          });
        } catch (error) {
          console.error("[PE:bg] Failed to save API keys:", error);
          // Fallback to local storage for compatibility
          await setApiKeys(message.apiKeys);
          sendResponse({ ok: true });
        }
        return;
      }

      if (message?.type === "get-history") {
        const history = await getHistory();
        sendResponse({ ok: true, history });
        return;
      }
      if (message?.type === "get-api-history") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/history`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to load history");
          }

          console.log("[PE:bg] History API response:", data.data);
          console.log("[PE:bg] Enhanced usage data:", data.data?.enhancedUsage);

          sendResponse({
            ok: true,
            data: data.data, // This includes both items and enhancedUsage
          });
        } catch (error) {
          console.error("[PE:bg] Failed to fetch history:", error);
          sendResponse({
            ok: false,
            error: error.message,
          });
        }
        return;
      }

      // Add a specific handler for enhanced usage data
      if (message?.type === "get-enhanced-usage") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          // Get both history (for enhanced usage) and quota data
          const [historyResponse, quotaResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/user/history`, {
              method: "GET",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_BASE_URL}/api/user/quota`, {
              method: "GET", 
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            })
          ]);

          if (!historyResponse.ok || !quotaResponse.ok) {
            throw new Error("Failed to fetch usage data");
          }

          const historyData = await historyResponse.json();
          const quotaData = await quotaResponse.json();

          if (!historyData.success || !quotaData.success) {
            throw new Error("Invalid API response");
          }

          const enhancedUsage = historyData.data?.enhancedUsage || {};
          const quotaInfo = quotaData.data || {};

          console.log("[PE:bg] Enhanced usage from API:", enhancedUsage);
          console.log("[PE:bg] Quota info from API:", quotaInfo);

          sendResponse({
            ok: true,
            data: {
              enhancedUsage,
              quotaInfo,
              historyItems: historyData.data?.items || []
            }
          });
        } catch (error) {
          console.error("[PE:bg] Failed to fetch enhanced usage:", error);
          sendResponse({
            ok: false,
            error: error.message,
          });
        }
        return;
      }

      if (message?.type === "get-api-quota") {
        try {
          const user = await getAuthenticatedUser();
          if (!user) {
            sendResponse({
              ok: false,
              error: "Authentication required",
            });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/user/quota`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || "Failed to load quota");
          }

          sendResponse({
            ok: true,
            data: data.data,
          });
        } catch (error) {
          console.error("[PE:bg] Failed to fetch quota:", error);
          sendResponse({
            ok: false,
            error: error.message,
          });
        }
        return;
      }

      if (message?.type === "enhance-prompt") {
        console.log("[PE:bg] enhance-prompt requested");
        const improved = await enhancePromptWithProvider({
          site: message.site,
          conversationText: message.conversationText || "",
          inputText: message.inputText || "",
        });
        sendResponse({ ok: true, improved });
        return;
      }
      if (message?.type === "command-enhance") {
        if (sender.tab?.id)
          chrome.tabs.sendMessage(sender.tab.id, { type: "trigger-enhance" });
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      console.warn("[PE:bg] onMessage error:", message?.type, e);
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true;
});

// Keyboard shortcut -> tell active tab to enhance
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "enhance-prompt") return;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;
    const url = tab.url || "";
    if (!/^https:\/\/(chat\.openai\.com|chatgpt\.com|claude\.ai)\//.test(url))
      return;
    console.log("[PE:bg] command-enhance -> content");
    chrome.tabs.sendMessage(tab.id, { type: "trigger-enhance" });
  } catch (e) {
    console.warn("[PE:bg] command-enhance error", e);
  }
});

// Storage cleanup function to prevent quota issues
async function cleanupStorage() {
  try {
    console.log("[PE:bg] Performing storage cleanup");

    // Get current storage usage
    const allData = await chrome.storage.sync.get(null);
    const dataSize = JSON.stringify(allData).length;

    console.log("[PE:bg] Current storage size:", dataSize, "bytes");

    // If we're getting close to quota limits, clean up aggressively
    if (dataSize > 50000) {
      // 50KB threshold
      console.log("[PE:bg] Storage size high, cleaning up...");

      // Clear history completely
      await chrome.storage.sync.remove(STORAGE_KEYS.history);

      // Reset maxHistoryItems to even lower value
      const settings = await getSettings();
      settings.maxHistoryItems = 5;
      await setSettings(settings);

      console.log("[PE:bg] Storage cleanup completed");
    }
  } catch (error) {
    console.warn("[PE:bg] Storage cleanup failed:", error);
  }
}

// Run cleanup with the existing onStartup listener
chrome.runtime.onStartup.addListener(() => {
  console.log("[PE:bg] onStartup service worker awake");
  cleanupStorage();
});

// ---------- Storage helpers ----------
async function getSettings() {
  const { [STORAGE_KEYS.settings]: settings } = await chrome.storage.sync.get(
    STORAGE_KEYS.settings
  );
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return merged;
}

async function setSettings(next) {
  console.log("[PE:bg] setSettings:", {
    enabled: next?.enabled,
    provider: next?.provider,
  });
  await chrome.storage.sync.set({ [STORAGE_KEYS.settings]: next });
  return next;
}

async function getApiKeys() {
  const { [STORAGE_KEYS.apiKeys]: apiKeys } = await chrome.storage.sync.get(
    STORAGE_KEYS.apiKeys
  );
  return apiKeys || { openaiKey: "", anthropicKey: "" };
}

async function setApiKeys(next) {
  console.log("[PE:bg] setApiKeys: updated (keys not logged)");
  await chrome.storage.sync.set({ [STORAGE_KEYS.apiKeys]: next });
  return next;
}

async function addHistoryItem(item) {
  try {
    const { [STORAGE_KEYS.history]: history } = await chrome.storage.sync.get(
      STORAGE_KEYS.history
    );
    const settings = await getSettings();
    const arr = Array.isArray(history) ? history : [];

    // Limit preview sizes to prevent quota exceeded
    const limitedItem = {
      ...item,
      id: crypto.randomUUID(),
      ts: Date.now(),
      inputPreview: (item.inputPreview || "").slice(0, 200), // Limit to 200 chars
      improvedPreview: (item.improvedPreview || "").slice(0, 200), // Limit to 200 chars
    };

    const limited = [limitedItem, ...arr].slice(
      0,
      settings.maxHistoryItems || DEFAULT_SETTINGS.maxHistoryItems
    );

    await chrome.storage.sync.set({ [STORAGE_KEYS.history]: limited });
  } catch (error) {
    console.warn("[PE:bg] Failed to save history item:", error.message);

    // If quota exceeded, try clearing old history and retry with smaller data
    if (error.message?.includes("quota")) {
      try {
        await chrome.storage.sync.remove(STORAGE_KEYS.history);
        const newItem = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          site: item.site,
          inputPreview: (item.inputPreview || "").slice(0, 100),
          improvedPreview: (item.improvedPreview || "").slice(0, 100),
        };
        await chrome.storage.sync.set({ [STORAGE_KEYS.history]: [newItem] });
        console.log("[PE:bg] Cleared history and saved minimal item");
      } catch (retryError) {
        console.warn(
          "[PE:bg] Failed to save even minimal history:",
          retryError.message
        );
      }
    }
  }
}

async function getHistory() {
  const { [STORAGE_KEYS.history]: history } = await chrome.storage.sync.get(
    STORAGE_KEYS.history
  );
  return Array.isArray(history) ? history : [];
}
