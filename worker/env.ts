import type { Provider } from "./validate";

export type Env = { DB: D1Database; RATE_LIMITER: RateLimit; ASSETS: Fetcher };
export type AiConfig = { provider: Provider; key: string; model: string };
export type AskModel = (cfg: AiConfig, system: string, user: string) => Promise<string>;
