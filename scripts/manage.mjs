// SPDX-License-Identifier: MPL-2.0
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstream = join(root, "upstream");
const build = join(root, ".build");
const source = join(build, "conversations");
const config = JSON.parse(readFileSync(join(root, "overrides/config.json")));
const command = process.argv[2];
const run = (program, args, cwd = root) =>
  execFileSync(program, args, { cwd, stdio: "inherit" });

function checkedPath(base, relative) {
  const path = resolve(base, relative);
  if (!path.startsWith(resolve(base) + sep)) {
    throw new Error(`Path escapes its directory: ${relative}`);
  }
  return path;
}

function prepare() {
  if (!existsSync(join(upstream, "package.json"))) {
    run("git", ["submodule", "update", "--init", "--recursive"]);
  }
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: upstream,
    encoding: "utf8",
  }).trim();
  if (sha !== config.upstreamCommit) {
    throw new Error(`Upstream commit ${sha} differs from ${config.upstreamCommit}`);
  }
  // Export tracked upstream bytes, never local edits, caches or credentials.
  const archive = execFileSync("git", ["archive", config.upstreamCommit], {
    cwd: upstream,
    maxBuffer: 32 * 1024 * 1024,
  });
  const packageText = execFileSync(
    "git", ["show", `${config.upstreamCommit}:package.json`],
    { cwd: upstream, encoding: "utf8" }
  );
  if (JSON.parse(packageText).version !== config.upstreamVersion) {
    throw new Error("The pinned upstream version does not match config.json");
  }
  if (existsSync(build) && realpathSync(build) !== build) {
    throw new Error("Refusing a symlinked build directory");
  }
  mkdirSync(build, { recursive: true });
  rmSync(source, { recursive: true, force: true });
  mkdirSync(source);
  execFileSync("tar", ["-xf", "-", "-C", source], { input: archive });
  // Isolate git apply from the parent BTIT repository.
  run("git", ["init", "--quiet"], source);
  for (const relative of config.patches) {
    const patch = checkedPath(join(root, "overrides"), relative);
    run("git", ["apply", "--check", patch], source);
    run("git", ["apply", patch], source);
  }
  for (const relative of config.files) {
    const input = checkedPath(join(root, "overrides/files"), relative);
    const output = checkedPath(source, relative);
    mkdirSync(dirname(output), { recursive: true });
    copyFileSync(input, output);
  }
  for (const relative of ["addon/manifest.json", "package.json"]) {
    const path = join(source, relative);
    const data = JSON.parse(readFileSync(path));
    data.version = config.version;
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  }
  // Use the upstream project's pinned formatter and toolchain.
  run("npm", ["ci"], source);
  run("npx", ["--no-install", "prettier", "--write", "addon/manifest.json", "package.json"], source);
  console.log(`Prepared Conversations ${config.version} from ${sha}`);
}

function buildXpi() {
  run("npm", ["run", "prod"], source);
  const outputDir = join(root, "artifacts");
  mkdirSync(outputDir, { recursive: true });
  const output = join(outputDir, `BTIT-Conversations-${config.version}.xpi`);
  copyFileSync(join(source, "conversations.xpi"), output);
  console.log(`XPI: ${output}`);
}

if (!["prepare", "test", "build", "verify"].includes(command)) {
  throw new Error("Usage: node scripts/manage.mjs prepare|test|build|verify");
}
prepare();
if (command === "test" || command === "verify") {
  run("npm", ["test"], source);
}
if (command === "build" || command === "verify") {
  buildXpi();
}
