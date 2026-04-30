import { getRequiredEnv } from "@/lib/env";

export async function callDeepSeekJson<T>(messages: Array<{ role: "system" | "user"; content: string }>): Promise<T> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
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

  if (!response.ok) {
    throw new Error(`DeepSeek request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek returned an empty response");
  }

  return JSON.parse(content) as T;
}
