import { getRequiredEnv } from "@/lib/env";

type DeepSeekOptions = {
  timeoutMs?: number;
  retryOnce?: boolean;
};

const defaultTimeoutMs = 30000;

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function isTransientStatus(status: number) {
  return status === 429 || status >= 500;
}

async function fetchDeepSeek(
  messages: Array<{ role: "system" | "user"; content: string }>,
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getRequiredEnv("DEEPSEEK_API_KEY")}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`DeepSeek request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callDeepSeekJson<T>(
  messages: Array<{ role: "system" | "user"; content: string }>,
  options: DeepSeekOptions = {}
): Promise<T> {
  const configuredTimeout = options.timeoutMs ?? Number(process.env.DEEPSEEK_TIMEOUT_MS ?? defaultTimeoutMs);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : defaultTimeoutMs;
  const attempts = options.retryOnce === false ? 1 : 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchDeepSeek(messages, timeoutMs);

    if (!response.ok) {
      const body = compactText(await response.text().catch(() => ""));
      lastError = new Error(body ? `DeepSeek request failed: ${response.status} ${body}` : `DeepSeek request failed: ${response.status}`);
      if (attempt < attempts && isTransientStatus(response.status)) continue;
      throw lastError;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("DeepSeek returned an empty response");
    }

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown JSON parse error";
      throw new Error(`DeepSeek returned invalid JSON: ${message}; content=${compactText(content)}`);
    }
  }

  throw lastError ?? new Error("DeepSeek request failed");
}
