import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WorkspaceManager } from "../src/services/workspace-manager.js";
import { execFile } from "../src/utils/process.js";
import { createTestConfig } from "./helpers.js";

async function initRepository(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await execFile("git", ["init", "--initial-branch", "main"], { cwd: root });
  await execFile("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFile("git", ["config", "user.name", "Test User"], { cwd: root });
  await writeFile(path.join(root, "README.md"), "# test\n", "utf8");
  await execFile("git", ["add", "."], { cwd: root });
  await execFile("git", ["commit", "-m", "init"], { cwd: root });
}

describe("WorkspaceManager", () => {
  it("creates an isolated clone and feature branch", async () => {
    const config = await createTestConfig("workspace-manager");
    const sourceRepo = path.join(config.stateRoot, "source");
    await initRepository(sourceRepo);

    const manager = new WorkspaceManager(config);
    const workspacePath = manager.getWorkspacePath("run-1");
    await manager.prepareWorkspace({
      id: "run-1",
      kind: "developer",
      parentRunId: "hans-1",
      personaId: "mary",
      repository: {
        input: sourceRepo,
        cloneUrl: sourceRepo,
        provider: "local",
      },
      baseBranch: "main",
      feature: "Feature",
      featureSlug: "feature",
      featureBranch: "copilot/feature-run-1",
      workspacePath,
      logPath: path.join(config.logsRoot, "run-1.log"),
      handoffPath: path.join(config.handoffsRoot, "run-1.json"),
      status: "queued",
      phase: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancellationRequested: false,
      integration: {
        remoteSessionMode: "off",
        dispatchStatus: "pending",
      },
      workflow: {
        provider: "openspec",
      },
      history: [{ phase: "queued", at: new Date().toISOString() }],
    });

    const branch = await execFile("git", ["branch", "--show-current"], { cwd: workspacePath });
    expect(branch.stdout.trim()).toBe("copilot/feature-run-1");
  });
});
