import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { brotliDecompressSync, gunzipSync } from "node:zlib";

const root = path.resolve(process.argv[2] ?? "dist");
const problems = [];
let checked = 0;

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) {
      walk(file);
      continue;
    }
    if (/\.m?js$/.test(name) && readFileSync(file, "utf8").includes("__VITE_PRELOAD__")) {
      problems.push(`${path.relative(root, file)} still contains __VITE_PRELOAD__`);
    }
    const match = /^(.*)\.(gz|br)$/.exec(name);
    if (!match) continue;
    const original = path.join(dir, match[1]);
    const decoded = match[2] === "gz" ? gunzipSync(readFileSync(file)) : brotliDecompressSync(readFileSync(file));
    checked += 1;
    if (!decoded.equals(readFileSync(original))) problems.push(`${path.relative(root, file)} differs from ${match[1]}`);
  }
};

walk(root);
if (problems.length) {
  console.error(`Precompressed files are wrong:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Precompressed files match their originals (${checked} checked).`);
