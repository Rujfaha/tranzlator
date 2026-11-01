import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  // Metro inlines this at build time; the Workers runtime has no `process`.
  define: { "process.env.EXPO_PUBLIC_API_URL": JSON.stringify("") },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations("./migrations") } },
    }),
  ],
}));
