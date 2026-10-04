// Starts the dev server against the mock API generated from the contract package (Prism).
// Equivalent to `VITE_API_MOCK=true npm run dev`, but works the same on every shell.
import { spawn } from "node:child_process";

const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, VITE_API_MOCK: "true" },
});

vite.on("exit", (code) => process.exit(code ?? 0));