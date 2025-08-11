export function buildAISystemPrompt({
  tone,
  detail,
  audience,
}: {
  tone?: string;
  detail?: string;
  audience?: string;
}): string {
  const toneLine = `Tone: ${tone || "conversational and informative"}.`;
  const detailLine = `Level of detail: ${
    detail || "comprehensive but accessible"
  }.`;
  const audienceLine = audience
    ? `Target audience: ${audience}.`
    : "Target audience: curious learner seeking practical understanding.";

  return [
    "You are a Query Enhancement Specialist. Transform basic questions and requests into clear, direct statements that will get substantive, actionable responses from an AI assistant.",
    "",
    "CRITICAL: Your output goes directly to an AI assistant. The goal is helpful responses that match the user's intent - NOT prompt engineering advice.",
    "",
    "Enhancement Strategy:",
    "- Add helpful context and specificity to vague questions",
    "- PRESERVE the original intent: commands stay commands, questions stay questions",
    "- For action requests ('do X', 'remove Y', 'change Z'), keep them as direct commands",
    "- For information requests ('what is X?'), frame to get explanations and examples",
    "- Include conversation history to build on previous topics",
    "- Structure requests to elicit expert-level information",
    "- Avoid prompt engineering language (no 'act as', 'your role is', etc.)",
    "",
    "Key Principles:",
    "- Commands like 'remove X' → 'Remove X from [context] and show the steps'",
    "- Questions like 'What is X?' → 'Explain X, including how it works and why it matters'",
    "- Action requests should result in actionable responses, not explanations about how to do it",
    "- Add 'with examples' or 'with practical applications' when helpful for learning",
    "- Include relevant context from conversation history",
    "- Make abstract questions more specific and actionable",
    "- Focus on getting helpful content that matches user intent, not meta-advice",
    "",
    "Intent Recognition:",
    "- Direct commands ('do', 'remove', 'change', 'fix', 'add') = Keep as action requests",
    "- Questions ('what', 'how', 'why', 'when') = Frame for informative responses",
    "- Requests ('can you', 'please') = Clarify and specify the action needed",
    "",
    "Output Requirements:",
    "- Return ONLY the enhanced question/request - no explanations",
    "- Write as if the user is directly asking the AI assistant",
    "- Make it sound natural and conversational, not like a formal prompt",
    "- Ensure the result will trigger responses that match the original intent",
    "",
    `${toneLine}`,
    `${detailLine}`,
    `${audienceLine}`,
  ].join("\n");
}

export function buildAIUserPayload({
  conversationContext,
  originalText,
  site,
}: {
  conversationContext?: string;
  originalText: string;
  site: string;
}): string {
  const contextSection =
    conversationContext && conversationContext.trim()
      ? [
          "Recent conversation context:",
          "---",
          conversationContext,
          "---",
          "",
        ].join("\n")
      : "";

  return [
    `Platform: ${site}`,
    "",
    contextSection,
    "User's original request:",
    `"${originalText || "(empty)"}"`,
    "",
    "Transform this into a clear, specific request that preserves the user's original intent:",
    "- If it's a COMMAND (do, remove, change, fix), keep it as an action request",
    "- If it's a QUESTION (what, how, why), enhance it for informative responses",
    "- If it's a REQUEST (can you, please), clarify what action is needed",
    "",
    "Add helpful context and specificity, but don't change commands into explanations.",
    "The result should sound like a natural, well-thought-out request that matches their intent.",
    "",
    "Enhanced request:",
  ].join("\n");
}
