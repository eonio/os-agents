import { copyFile, access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(import.meta.dirname, "..");
const targetRoot = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const exampleFiles = ["os-agents.config-example.json"];
const gitIgnoreEntries = [
  "node_modules/",
  ".os-agents/",
  "openspec/",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyExampleFiles() {
  for (const filename of exampleFiles) {
    const source = path.join(packageRoot, filename);
    const target = path.join(targetRoot, filename);

    if (await exists(target)) {
      continue;
    }

    await copyFile(source, target);
  }
}

async function syncGitIgnore() {
  const gitIgnorePath = path.join(targetRoot, ".gitignore");
  const current = (await exists(gitIgnorePath)) ? await readFile(gitIgnorePath, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const normalized = new Set(lines.map((line) => line.trim()).filter(Boolean));
  const missingEntries = gitIgnoreEntries.filter((entry) => !normalized.has(entry));

  if (!missingEntries.length) {
    return;
  }

  const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  const nextContent =
    `${current}${prefix}# OS Agents\n${missingEntries.join("\n")}\n`;
  await writeFile(gitIgnorePath, nextContent, "utf8");
}

export async function runPostinstall() {
  await copyExampleFiles();
  await syncGitIgnore();
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  await runPostinstall();
}
