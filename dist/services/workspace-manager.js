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
        await execFile("git", ["clone", "--branch", run.baseBranch, "--single-branch", run.repository.cloneUrl, workspacePath], {});
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
}
//# sourceMappingURL=workspace-manager.js.map