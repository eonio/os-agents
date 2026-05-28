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
    await initRepository(config.projectRoot);

    const manager = new WorkspaceManager(config);
    const workspacePath = manager.getWorkspacePath("run-1");
    await manager.prepareWorkspace({
      id: "run-1",
      kind: "developer",
      parentRunId: "hans-1",
      personaId: "mary",
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
      team: {
        orchestratorName: "Hans",
        memberResults: [],
        contributions: [],
        decisions: [],
      },
      prd: {
        title: "Feature",
        version: "1.0.0",
        date: "2026-05-28",
        filePath: path.join(config.featuresRoot, "feature-v1.0.0-2026-05-28.md"),
        discussionItems: [],
      },
      history: [{ phase: "queued", at: new Date().toISOString() }],
    });

    const branch = await execFile("git", ["branch", "--show-current"], { cwd: workspacePath });
    expect(branch.stdout.trim()).toBe("copilot/feature-run-1");
  });

  it("fails fast when the project root is not a git repository", async () => {
    const config = await createTestConfig("workspace-manager-plain");
    await mkdir(config.projectRoot, { recursive: true });
    await writeFile(path.join(config.projectRoot, "plain.txt"), "plain project\n", "utf8");

    const manager = new WorkspaceManager(config);
    const workspacePath = manager.getWorkspacePath("run-plain");
    await expect(
      manager.prepareWorkspace({
        id: "run-plain",
        kind: "developer",
        parentRunId: "hans-plain",
        personaId: "mary",
        baseBranch: "main",
        feature: "Plain Feature",
        featureSlug: "plain-feature",
        featureBranch: "copilot/plain-feature-run",
        workspacePath,
        logPath: path.join(config.logsRoot, "run-plain.log"),
        handoffPath: path.join(config.handoffsRoot, "run-plain.json"),
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
        team: {
          orchestratorName: "Hans",
          memberResults: [],
          contributions: [],
          decisions: [],
        },
        prd: {
          title: "Plain Feature",
          version: "1.0.0",
          date: "2026-05-28",
          filePath: path.join(config.featuresRoot, "plain-feature-v1.0.0-2026-05-28.md"),
          discussionItems: [],
        },
        history: [{ phase: "queued", at: new Date().toISOString() }],
      }),
    ).rejects.toThrow(/not a git repository/i);
  });

  it("fails fast when the project root has no commits yet", async () => {
    const config = await createTestConfig("workspace-manager-empty-repo");
    await mkdir(config.projectRoot, { recursive: true });
    await execFile("git", ["init", "--initial-branch", "main"], { cwd: config.projectRoot });

    const manager = new WorkspaceManager(config);
    await expect(
      manager.prepareWorkspace({
        id: "run-empty",
        kind: "developer",
        parentRunId: "hans-empty",
        personaId: "mary",
        baseBranch: "main",
        feature: "Empty Repo Feature",
        featureSlug: "empty-repo-feature",
        featureBranch: "copilot/empty-repo-feature-run",
        workspacePath: manager.getWorkspacePath("run-empty"),
        logPath: path.join(config.logsRoot, "run-empty.log"),
        handoffPath: path.join(config.handoffsRoot, "run-empty.json"),
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
        team: {
          orchestratorName: "Hans",
          memberResults: [],
          contributions: [],
          decisions: [],
        },
        prd: {
          title: "Empty Repo Feature",
          version: "1.0.0",
          date: "2026-05-28",
          filePath: path.join(config.featuresRoot, "empty-repo-feature-v1.0.0-2026-05-28.md"),
          discussionItems: [],
        },
        history: [{ phase: "queued", at: new Date().toISOString() }],
      }),
    ).rejects.toThrow(/does not have any commits yet/i);
  });
});
