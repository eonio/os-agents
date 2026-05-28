import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { execFile } from "../utils/process.js";
export class WorkspaceManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async prepareWorkspace(run) {
        return this.prepareWorkspaceAt(run, run.workspacePath);
    }
    async prepareWorkspaceAt(run, workspacePath) {
        await mkdir(this.config.workspaceRoot, { recursive: true });
        await rm(workspacePath, { recursive: true, force: true });
        if (!(await this.isGitRepository(this.config.projectRoot))) {
            throw new Error([
                `Project root "${this.config.projectRoot}" is not a git repository.`,
                "Initialize git in the project root yourself before running os-agents.",
                `Recommended command: git init --initial-branch ${run.baseBranch}`,
            ].join(" "));
        }
        if (!(await this.hasCommitHistory(this.config.projectRoot))) {
            throw new Error([
                `Project root "${this.config.projectRoot}" does not have any commits yet.`,
                "Create the initial commit in the project root yourself before running os-agents.",
                "Recommended commands: git add . && git commit -m \"Initial commit\"",
            ].join(" "));
        }
        await execFile("git", ["clone", "--branch", run.baseBranch, "--single-branch", this.config.projectRoot, workspacePath], {});
        await execFile("git", ["checkout", "-b", run.featureBranch], { cwd: workspacePath });
        return run;
    }
    async cleanup(run) {
        const shouldRetain = (run.status === "completed" && this.config.retention.completed) ||
            (run.status === "failed" && this.config.retention.failed) ||
            (run.status === "cancelled" && this.config.retention.cancelled);
        if (!shouldRetain) {
            await rm(run.workspacePath, { recursive: true, force: true });
        }
    }
    getWorkspacePath(runId) {
        return path.join(this.config.workspaceRoot, runId);
    }
    async isGitRepository(targetPath) {
        try {
            const result = await execFile("git", ["rev-parse", "--is-inside-work-tree"], {
                cwd: targetPath,
            });
            return result.stdout.trim() === "true";
        }
        catch {
            return false;
        }
    }
    async hasCommitHistory(targetPath) {
        try {
            await execFile("git", ["rev-parse", "--verify", "HEAD"], { cwd: targetPath });
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=workspace-manager.js.map