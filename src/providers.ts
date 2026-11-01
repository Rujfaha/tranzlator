export type Provider = "anthropic" | "gemini" | "openai" | "openrouter";
export type AiSettings = { provider: Provider; key: string; model: string };
