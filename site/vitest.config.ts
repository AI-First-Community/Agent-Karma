import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Same `@karma` alias as astro.config so tests resolve the engine source.
export default defineConfig({
  resolve: {
    alias: {
      "@karma": fileURLToPath(new URL("../extension/src", import.meta.url)),
    },
  },
});
