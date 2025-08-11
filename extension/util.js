// ---------- Enhanced Prompt Engineering System ----------

export function buildSystemPrompt({ tone, detail, audience }) {
  const toneLine = `Tone: ${tone || "conversational and informative"}.`;
  const detailLine = `Level of detail: ${
    detail || "comprehensive but accessible"
  }.`;
  const audienceLine = audience
    ? `Target audience: ${audience}.`
    : "Target audience: curious learner seeking practical understanding.";

  return [
    "You are a Query Enhancement Specialist. Your job is to transform basic questions into clear, direct requests that will get the user the best possible informative response.",
    "",
    "CRITICAL: Your output will be sent directly to an AI assistant. The goal is to get substantive, educational answers - NOT prompt engineering advice.",
    "",
    "Enhancement Strategy:",
    "- Add helpful context and specificity to vague questions",
    "- Frame questions to request explanations, examples, and practical insights",
    "- Include conversation history to build on previous topics",
    "- Structure requests to elicit expert-level information",
    "- Avoid language that sounds like prompt engineering (no 'act as', 'your role is', etc.)",
    "",
    "Key Principles:",
    "- Transform 'What is X?' into 'Explain X, including how it works and why it matters'",
    "- Add 'with examples' or 'with practical applications' when helpful",
    "- Include relevant context from the conversation history",
    "- Make abstract questions more specific and actionable",
    "- Focus on getting informative content, not meta-advice about prompting",
    "",
    "Output Requirements:",
    "- Return ONLY the enhanced question/request - no explanations",
    "- Write as if the user is directly asking the AI assistant",
    "- Make it sound natural and conversational, not like a formal prompt",
    "- Ensure the resulting query will trigger informative responses, not prompt advice",
    "",
    `${toneLine}`,
    `${detailLine}`,
    `${audienceLine}`,
  ].join("\n");
}

export function buildUserPayload({ conversationText, inputText, site }) {
  const contextSection =
    conversationText && conversationText.trim()
      ? [
          "Recent conversation context:",
          "---",
          conversationText,
          "---",
          "",
        ].join("\n")
      : "";

  return [
    `Platform: ${site}`,
    "",
    contextSection,
    "User's original question:",
    `"${inputText || "(empty)"}"`,
    "",
    "Transform this into a clear, specific request that will get an informative, educational response.",
    "Focus on enhancing clarity and adding helpful context - avoid prompt engineering language.",
    "The result should sound like a natural, well-thought-out question from someone seeking to learn.",
    "",
    "Enhanced question:",
  ].join("\n");
}

// Alternative approach - Template-based enhancement for common patterns
export function enhanceQuestionWithTemplate(inputText, conversationContext) {
  const input = inputText?.toLowerCase() || "";

  // Pattern matching for common question types
  const patterns = [
    {
      // "What is X?" pattern
      regex: /^what\s+is\s+(.+)\??$/i,
      template: (match) =>
        `Explain ${match[1]}, including how it works, why it's important, and provide some practical examples.`,
    },
    {
      // "How to X?" pattern
      regex: /^how\s+to\s+(.+)\??$/i,
      template: (match) =>
        `Provide a step-by-step explanation of how to ${match[1]}, including best practices and common pitfalls to avoid.`,
    },
    {
      // "Why X?" pattern
      regex: /^why\s+(.+)\??$/i,
      template: (match) =>
        `Explain why ${match[1]}, covering the underlying reasons, mechanisms, and implications.`,
    },
    {
      // "Difference between X and Y" pattern
      regex: /difference\s+between\s+(.+)\s+and\s+(.+)/i,
      template: (match) =>
        `Compare ${match[1]} and ${match[2]}, explaining their key differences, similarities, and when you might use each one.`,
    },
    {
      // "Best X for Y" pattern
      regex: /best\s+(.+)\s+for\s+(.+)/i,
      template: (match) =>
        `Recommend the best ${match[1]} for ${match[2]}, explaining your reasoning and providing alternatives with their trade-offs.`,
    },
  ];

  // Try to match patterns
  for (const pattern of patterns) {
    const match = inputText.match(pattern.regex);
    if (match) {
      let enhanced = pattern.template(match);

      // Add conversation context if relevant
      if (conversationContext) {
        enhanced += ` (Building on our previous discussion about ${extractMainTopic(
          conversationContext
        )}).`;
      }

      return enhanced;
    }
  }

  // Fallback: generic enhancement
  let enhanced = inputText;
  if (conversationContext) {
    const topic = extractMainTopic(conversationContext);
    if (topic) {
      enhanced += ` Please relate this to our earlier discussion about ${topic} where relevant.`;
    }
  }

  // Add request for examples if the question seems abstract
  if (
    !enhanced.toLowerCase().includes("example") &&
    isAbstractQuestion(enhanced)
  ) {
    enhanced += " Please include relevant examples to illustrate your points.";
  }

  return enhanced;
}

function extractMainTopic(conversationText) {
  // Simple extraction - get key nouns/topics from recent messages
  // In a real implementation, this could use NLP or keyword extraction
  const words = conversationText.toLowerCase().split(/\s+/);
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "how",
    "what",
    "why",
    "when",
    "where",
    "i",
    "you",
    "it",
    "this",
    "that",
    "is",
    "are",
    "was",
    "were",
    "can",
    "could",
    "would",
    "should",
  ]);

  const keywords = words
    .filter((word) => word.length > 3 && !commonWords.has(word))
    .slice(-5); // Get last 5 relevant words

  return keywords.join(", ");
}

function isAbstractQuestion(text) {
  const abstractIndicators = [
    "concept",
    "theory",
    "principle",
    "idea",
    "approach",
    "method",
    "strategy",
    "philosophy",
  ];
  return abstractIndicators.some((indicator) =>
    text.toLowerCase().includes(indicator)
  );
}

function trimText(text, maxChars = 8000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  // Try to trim at sentence boundaries
  const trimmed = text.slice(-maxChars);
  const sentenceStart = trimmed.indexOf(". ");

  return sentenceStart > 0 ? trimmed.slice(sentenceStart + 2) : trimmed;
}

// Main enhancement function with fallback options
export function enhanceUserQuery({
  conversationText,
  inputText,
  site,
  tone,
  detail,
  audience,
}) {
  // Option 1: Try template-based enhancement first (faster, more predictable)
  const templateEnhanced = enhanceQuestionWithTemplate(
    inputText,
    conversationText
  );

  // Option 2: If template matching fails or for complex cases, use AI enhancement
  const systemPrompt = buildSystemPrompt({ tone, detail, audience });
  const userPayload = buildUserPayload({
    conversationText: trimText(conversationText),
    inputText,
    site,
  });

  return {
    templateEnhanced,
    systemPrompt,
    userPayload,
    useTemplate: shouldUseTemplate(inputText), // Helper to decide which approach
  };
}

function shouldUseTemplate(inputText) {
  // Use templates for simple, common question patterns
  const simplePatterns =
    /^(what is|how to|why |difference between|best .+ for)/i;
  return simplePatterns.test(inputText?.trim() || "");
}
