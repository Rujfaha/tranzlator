export type Provider = "anthropic" | "gemini" | "openai" | "openrouter";
export type AiSettings = { provider: Provider; key: string; model: string };

// Model ids and key pages checked against each provider's docs on 2026-11-01.
export const PROVIDER_INFO: Record<Provider, { label: string; defaultModel: string; keyUrl: string }> = {
  anthropic: { label: "Anthropic (Claude)", defaultModel: "claude-sonnet-5-5", keyUrl: "https://console.anthropic.com/" },
  gemini: { label: "Google Gemini", defaultModel: "gemini-3.8-flash", keyUrl: "https://aistudio.google.com/apikey" },
  openai: { label: "OpenAI", defaultModel: "gpt-6-luna", keyUrl: "https://platform.openai.com/api-keys" },
  openrouter: { label: "OpenRouter", defaultModel: "openai/gpt-6.1-terra", keyUrl: "https://openrouter.ai/keys" },
};

export function parseSettings(raw: string | null): AiSettings | null {
  try {
    const s = JSON.parse(raw ?? "");
    if (Object.hasOwn(PROVIDER_INFO, s.provider) && typeof s.key === "string" && s.key && typeof s.model === "string" && s.model) {
      return { provider: s.provider, key: s.key, model: s.model };
    }
  } catch {}
  return null;
}
