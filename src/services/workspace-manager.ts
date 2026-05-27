import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { AppConfig, RunRecord } from "../domain/types.js";
import { execFile } from "../utils/process.js";

export class WorkspaceManager {
  public constructor(private readonly config: AppConfig) {}

  public async prepareWorkspace(run: RunRecord): Promise<RunRecord> {
    return this.prepareWorkspaceAt(run, run.workspacePath);
  }

  public async prepareWorkspaceAt(run: RunRecord, workspacePath: string): Promise<RunRecord> {
    await mkdir(this.config.workspaceRoot, { recursive: true });
    await rm(workspacePath, { recursive: true, force: true });
    await execFile(
      "git",
      ["clone", "--branch", run.baseBranch, "--single-branch", run.repository.cloneUrl, workspacePath],
      {},
    );
    await execFile("git", ["checkout", "-b", run.featureBranch], { cwd: workspacePath });
    return run;
  }

  public async cleanup(run: RunRecord): Promise<void> {
    const shouldRetain =
      (run.status === "completed" && this.config.retention.completed) ||
      (run.status === "failed" && this.config.retention.failed) ||
      (run.status === "cancelled" && this.config.retention.cancelled);

    if (!shouldRetain) {
      await rm(run.workspacePath, { recursive: true, force: true });
    }
  }

  public getWorkspacePath(runId: string): string {
    return path.join(this.config.workspaceRoot, runId);
  }
}
