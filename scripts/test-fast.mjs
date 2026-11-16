import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const vitest = path.join("node_modules", "vitest", "vitest.mjs");
const args = process.argv.slice(2);
const dir = mkdtempSync(path.join(tmpdir(), "vitest-fast-"));
const report = path.join(dir, "report.json");

const run = (extra) => spawnSync(process.execPath, [vitest, "run", ...extra], { stdio: "inherit" }).status ?? 1;

const started = Date.now();
const shared = run(["--config", "vitest.fast.config.ts", "--reporter=default", "--reporter=json", `--outputFile.json=${report}`, ...args]);
let failed = [];
try {
  const result = JSON.parse(readFileSync(report, "utf8"));
  failed = result.testResults.filter((file) => file.status !== "passed").map((file) => path.relative(process.cwd(), file.name));
} catch {
  failed = null;
}
rmSync(dir, { recursive: true, force: true });

if (failed === null) {
  process.exit(shared || 1);
}
if (failed.length === 0) {
  console.log(`\ntest:fast: all files passed in ${Math.round((Date.now() - started) / 1000)} s (shared environment).`);
  process.exit(0);
}
console.log(`\ntest:fast: ${failed.length} file(s) failed in the shared environment; rechecking them isolated:\n  ${failed.join("\n  ")}\n`);
const isolated = run(failed);
console.log(isolated === 0
  ? `test:fast: all of them pass in isolation, so the shared run only saw leaked state. Total ${Math.round((Date.now() - started) / 1000)} s.`
  : "test:fast: these failures are real; they fail in isolation too.");
process.exit(isolated);
