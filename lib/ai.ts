// AI Provider API calls
export async function callOpenAI({
  apiKey,
  model,
  system,
  user,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: model || "gpt-4o",
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 1000,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("[API] OpenAI error:", res.status, errText.slice(0, 300));

    // Handle specific error types
    if (res.status === 401) {
      throw new Error(
        "Invalid OpenAI API key. Please check your API key in settings."
      );
    } else if (res.status === 403) {
      throw new Error(
        "OpenAI API access forbidden. Please check your API key permissions."
      );
    } else if (res.status === 429) {
      throw new Error(
        "OpenAI API rate limit exceeded. Please try again later."
      );
    } else if (res.status === 400) {
      const errorData = JSON.parse(errText);
      throw new Error(
        `OpenAI API error: ${errorData.error?.message || "Invalid request"}`
      );
    }

    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content.");

  // Get detailed token usage if available
  const usageTokens = data?.usage?.total_tokens || 0;
  const inputTokens = data?.usage?.prompt_tokens || 0;
  const outputTokens = data?.usage?.completion_tokens || 0;

  return {
    text,
    usageTokens,
    inputTokens,
    outputTokens,
  };
}

export async function callAnthropic({
  apiKey,
  model,
  system,
  user,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}) {
  const url = "https://api.anthropic.com/v1/messages";
  const body = {
    model: model || "claude-3-5-sonnet-20240620",
    max_tokens: 1024,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: user }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("[API] Anthropic error:", res.status, errText.slice(0, 300));

    // Handle specific error types
    if (res.status === 401) {
      throw new Error(
        "Invalid Anthropic API key. Please check your API key in settings."
      );
    } else if (res.status === 403) {
      throw new Error(
        "Anthropic API access forbidden. Please check your API key permissions."
      );
    } else if (res.status === 429) {
      throw new Error(
        "Anthropic API rate limit exceeded. Please try again later."
      );
    } else if (res.status === 400) {
      const errorData = JSON.parse(errText);
      throw new Error(
        `Anthropic API error: ${errorData.error?.message || "Invalid request"}`
      );
    }

    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const text =
    Array.isArray(data?.content) && data.content[0]?.text
      ? data.content[0].text.trim()
      : "";
  if (!text) throw new Error("Anthropic returned empty content.");

  // Get detailed token usage if available
  const inputTokens = data?.usage?.input_tokens || 0;
  const outputTokens = data?.usage?.output_tokens || 0;
  const usageTokens = inputTokens + outputTokens;

  return {
    text,
    usageTokens,
    inputTokens,
    outputTokens,
  };
}
