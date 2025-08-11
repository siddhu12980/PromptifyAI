import { createDecipheriv } from "crypto";
import dbConnect from "@/lib/db";
import { User, Usage, Prompt } from "@/lib/models";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Helper function to decrypt API key
export function decryptApiKey(encryptedKey: string, iv: string, tag: string) {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Helper function to get user's API key
export async function getUserApiKey(
  user: any,
  provider: "openai" | "anthropic"
) {
  try {
    // Find user with encrypted API key fields
    const userWithKeys = await User.findById(user._id)
      .select(
        `+apiKeys.${provider}.encryptedKey +apiKeys.${provider}.iv +apiKeys.${provider}.tag`
      )
      .select(`+apiKeys.${provider}.isValid`);

    if (!userWithKeys) {
      throw new Error("User not found");
    }

    const apiKeyData = userWithKeys.apiKeys?.[provider];
    if (!apiKeyData?.encryptedKey || !apiKeyData.isValid) {
      return null; // No valid personal API key
    }

    // Decrypt the API key
    const decryptedKey = decryptApiKey(
      apiKeyData.encryptedKey,
      apiKeyData.iv,
      apiKeyData.tag
    );

    return {
      key: decryptedKey,
      isPersonal: true,
    };
  } catch (error) {
    console.error(`Failed to get ${provider} API key:`, error);
    return null;
  }
}

// Template-based enhancement for simple patterns
export function enhanceWithTemplate(
  inputText: string,
  conversationContext?: string
): string | null {
  if (!inputText?.trim()) return null;

  const input = inputText.trim();

  const patterns = [
    {
      regex: /^what\s+is\s+(.+?)\??$/i,
      template: (match: RegExpMatchArray) =>
        `Explain ${match[1]}, including how it works, why it's important, and provide practical examples.`,
    },
    {
      regex: /^how\s+(to\s+|do\s+i\s+)?(.+?)\??$/i,
      template: (match: RegExpMatchArray) =>
        `Provide a step-by-step explanation of how to ${match[2]}, including best practices and common pitfalls to avoid.`,
    },
    {
      regex: /^why\s+(.+?)\??$/i,
      template: (match: RegExpMatchArray) =>
        `Explain why ${match[1]}, covering the underlying reasons, mechanisms, and implications.`,
    },
    {
      regex: /(?:what.*?)?difference\s+between\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
      template: (match: RegExpMatchArray) =>
        `Compare ${match[1]} and ${match[2]}, explaining their key differences, similarities, and when you might use each one.`,
    },
    {
      regex: /(?:what.*?)?best\s+(.+?)\s+for\s+(.+?)(?:\?|$)/i,
      template: (match: RegExpMatchArray) =>
        `Recommend the best ${match[1]} for ${match[2]}, explaining your reasoning and providing alternatives with their trade-offs.`,
    },
    {
      regex: /^can\s+you\s+explain\s+(.+?)\??$/i,
      template: (match: RegExpMatchArray) =>
        `Explain ${match[1]} in detail, including key concepts, how it works, and relevant examples.`,
    },
    {
      regex: /^tell\s+me\s+about\s+(.+?)(?:\?|$)/i,
      template: (match: RegExpMatchArray) =>
        `Provide a comprehensive overview of ${match[1]}, including its importance, key features, and practical applications.`,
    },
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern.regex);
    if (match) {
      let enhanced = pattern.template(match);

      if (conversationContext?.trim()) {
        const topic = extractMainTopicFromContext(conversationContext);
        if (topic) {
          enhanced += ` Please relate this to our previous discussion about ${topic} where relevant.`;
        }
      }

      return enhanced;
    }
  }

  return null;
}

export function extractMainTopicFromContext(
  conversationText: string
): string | null {
  if (!conversationText) return null;

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
    "make",
  ]);

  const keywords = words
    .filter((word) => !commonWords.has(word))
    .slice(-10)
    .slice(0, 3);

  return keywords.length > 0 ? keywords.join(", ") : null;
}

export function shouldUseTemplate(inputText: string): boolean {
  if (!inputText?.trim()) return false;
  const simplePatterns =
    /^(what\s+is|how\s+(to\s+|do\s+i\s+)?|why\s+|.*difference\s+between|.*best\s+.*\s+for|can\s+you\s+explain|tell\s+me\s+about)/i;
  return simplePatterns.test(inputText.trim());
}

// Get API key with fallback logic
export async function getApiKey(user: any, provider: "openai" | "anthropic") {
  // First try to get user's personal API key
  const personalKey = await getUserApiKey(user, provider);
  if (personalKey) {
    return personalKey;
  }

  // Fallback to shared API key
  const sharedKey =
    provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.ANTHROPIC_API_KEY;

  if (!sharedKey) {
    throw new Error(
      `No ${provider} API key available. Please add your personal API key in settings for unlimited usage, or contact support.`
    );
  }

  return {
    key: sharedKey,
    isPersonal: false,
  };
}

export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  // OpenAI pricing (as of 2024)
  if (provider === "openai") {
    const pricing = {
      "gpt-4o": { input: 0.005, output: 0.015 }, // per 1K tokens
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-4": { input: 0.03, output: 0.06 },
      "gpt-3.5-turbo": { input: 0.0015, output: 0.002 },
    };

    const modelPricing =
      pricing[model as keyof typeof pricing] || pricing["gpt-4o"];
    return (
      (inputTokens / 1000) * modelPricing.input +
      (outputTokens / 1000) * modelPricing.output
    );
  }

  // Anthropic pricing (as of 2024)
  if (provider === "anthropic") {
    const pricing = {
      "claude-3-5-sonnet-20240620": { input: 0.003, output: 0.015 },
      "claude-3-opus": { input: 0.015, output: 0.075 },
      "claude-3-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    };

    const modelPricing =
      pricing[model as keyof typeof pricing] ||
      pricing["claude-3-5-sonnet-20240620"];
    return (
      (inputTokens / 1000) * modelPricing.input +
      (outputTokens / 1000) * modelPricing.output
    );
  }

  return 0;
}
