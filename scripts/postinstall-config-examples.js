import { copyFile, access } from "node:fs/promises";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const targetRoot = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const exampleFiles = [
  "os-agents.config-example.yaml",
  "os-agents.config-example.yml",
  "os-agents.config-example.json",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

for (const filename of exampleFiles) {
  const source = path.join(packageRoot, filename);
  const target = path.join(targetRoot, filename);

  if (await exists(target)) {
    continue;
  }

  await copyFile(source, target);
}
