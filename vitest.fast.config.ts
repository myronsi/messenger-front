import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vite.config";

export default defineConfig((env) => {
  const resolved = typeof base === "function" ? base(env) : base;
  return mergeConfig(resolved, {
    test: {
      isolate: false,
      setupFiles: ["./src/test/sharedReset.ts"],
    },
  });
});
