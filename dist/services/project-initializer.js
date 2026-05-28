import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";
const REQUIRED_GITIGNORE_ENTRIES = [
    "node_modules/",
    ".os-agents/",
    "openspec/",
];
async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function getPackageRoot() {
    return path.resolve(import.meta.dirname, "..", "..");
}
export class ProjectInitializer {
    projectRoot;
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
    }
    getStateRoot() {
        return path.join(this.projectRoot, ".os-agents");
    }
    async isInitialized() {
        return exists(this.getStateRoot());
    }
    async assertInitialized() {
        if (await this.isInitialized()) {
            return;
        }
        throw new Error(`OS Agents is not initialized in "${this.projectRoot}". Run "os-agents init" in this folder first.`);
    }
    async initialize(configPath) {
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
            mkdir(config.copilot.baseDirectory, { recursive: true }),
        ]);
    }
    async copyExampleConfig() {
        const packageRoot = getPackageRoot();
        const source = path.join(packageRoot, "os-agents.config-example.json");
        const target = path.join(this.projectRoot, "os-agents.config-example.json");
        if (await exists(target)) {
            return;
        }
        await copyFile(source, target);
    }
    async syncGitIgnore() {
        const gitIgnorePath = path.join(this.projectRoot, ".gitignore");
        const current = (await exists(gitIgnorePath)) ? await readFile(gitIgnorePath, "utf8") : "";
        const normalized = new Set(current
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean));
        const missingEntries = REQUIRED_GITIGNORE_ENTRIES.filter((entry) => !normalized.has(entry));
        if (!missingEntries.length) {
            return;
        }
        const prefix = current.length === 0 || current.endsWith("\n") ? "" : "\n";
        const nextContent = `${current}${prefix}# OS Agents\n${missingEntries.join("\n")}\n`;
        await writeFile(gitIgnorePath, nextContent, "utf8");
    }
}
//# sourceMappingURL=project-initializer.js.map