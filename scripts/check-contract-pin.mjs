// Guards the version of @myronsi/messenger-api:
//   always   - the dependency is an exact version and the lockfile agrees with it
//   --stable - the version is not a `-next` snapshot (used on main, where only released contracts may be built against)
import { readFileSync } from "node:fs";

const PACKAGE = "@myronsi/messenger-api";
const EXACT_VERSION = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const NEXT_SNAPSHOT = /(^|[-.])next(\.|$)/;

const stable = process.argv.includes("--stable");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf-8"));

const pinned = pkg.dependencies?.[PACKAGE];
const locked = lock.packages?.[`node_modules/${PACKAGE}`]?.version;
const errors = [];

if (!pinned) errors.push(`${PACKAGE} is not a dependency`);
else if (!EXACT_VERSION.test(pinned)) errors.push(`${PACKAGE} must be pinned to an exact version (npm i -E), found "${pinned}"`);
if (pinned && locked !== pinned) errors.push(`package-lock.json has ${locked ?? "nothing"} but package.json pins ${pinned}; run npm install`);
if (stable && pinned && NEXT_SNAPSHOT.test(pinned)) {
  errors.push(`${PACKAGE}@${pinned} is a -next snapshot of an unreleased contract; main must use a released version`);
}

if (errors.length) {
  for (const error of errors) console.error(`::error::${error}`);
  process.exit(1);
}
console.log(`${PACKAGE}@${pinned} OK${stable ? " (stable)" : ""}`);