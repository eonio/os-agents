import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";

const REQUIRED_GITIGNORE_ENTRIES = [
  "node_modules/",
  ".os-agents/",
  "openspec/",
] as const;

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getPackageRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..");
}

export class ProjectInitializer {
  public constructor(private readonly projectRoot = process.cwd()) {}

  public getStateRoot(): string {
    return path.join(this.projectRoot, ".os-agents");
  }

  public async isInitialized(): Promise<boolean> {
    return exists(this.getStateRoot());
  }

  public async assertInitialized(): Promise<void> {
    if (await this.isInitialized()) {
      return;
    }

    throw new Error(
      `OS Agents is not initialized in "${this.projectRoot}". Run "os-agents init" in this folder first.`,
    );
  }

  public async initialize(configPath?: string): Promise<void> {
    await this.copyExampleConfig();
    await this.syncGitIgnore();
    const config = await loadConfig(configPath);
    await Promise.all([
      mkdir(config.stateRoot, { recursive: true }),
      mkdir(config.workspaceRoot, { recursive: true }),
      mkdir(config.runsRoot, { recursive: true }),
      mkdir(config.logsRoot, { recursive: true }),
      mkdir(config.handoffsRoot, { recursive: true }),
      mkdir(config.featuresRoot, { recursive: true }),
      ...(config.copilot.baseDirectory
        ? [mkdir(config.copilot.baseDirectory, { recursive: true })]
        : []),
    ]);
  }

  private async copyExampleConfig(): Promise<void> {
    const packageRoot = getPackageRoot();
    const source = path.join(packageRoot, "os-agents.config-example.json");
    const target = path.join(this.projectRoot, "os-agents.config-example.json");

    if (await exists(target)) {
      return;
    }

    await copyFile(source, target);
  }

  private async syncGitIgnore(): Promise<void> {
    const gitIgnorePath = path.join(this.projectRoot, ".gitignore");
    const current = (await exists(gitIgnorePath)) ? await readFile(gitIgnorePath, "utf8") : "";
    const normalized = new Set(
      current
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
    const missingEntries = REQUIRED_GITIGNORE_ENTRIES.filter((entry) => !normalized.has(entry));

    if (!missingEntries.length) {
      return;
    }

    const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
    const nextContent = `${current}${prefix}# OS Agents\n${missingEntries.join("\n")}\n`;
    await writeFile(gitIgnorePath, nextContent, "utf8");
  }
}
