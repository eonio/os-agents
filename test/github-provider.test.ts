import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GitHubProvider } from "../src/providers/github-provider.js";
import { execFile } from "../src/utils/process.js";
import { createTestConfig } from "./helpers.js";

async function initRepository(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await execFile("git", ["init", "--initial-branch", "main"], { cwd: root });
  await execFile("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFile("git", ["config", "user.name", "Test User"], { cwd: root });
  await writeFile(path.join(root, "README.md"), "# test\n", "utf8");
  await execFile("git", ["remote", "add", "origin", "git@github.com:owner/repo.git"], {
    cwd: root,
  });
  await execFile("git", ["add", "."], { cwd: root });
  await execFile("git", ["commit", "-m", "init"], { cwd: root });
}

describe("GitHubProvider", () => {
  it("writes a handoff artifact when dispatch is skipped", async () => {
    const config = await createTestConfig("github-provider");
    await initRepository(config.projectRoot);
    const provider = new GitHubProvider(config);
    const workspacePath = path.join(config.workspaceRoot, "run-1");
    await execFile("git", ["clone", "--branch", "main", "--single-branch", config.projectRoot, workspacePath]);

    const run = {
      id: "run-1",
      kind: "orchestrator" as const,
      baseBranch: "main",
      feature: "Ship feature",
      featureSlug: "ship-feature",
      featureBranch: "copilot/ship-feature-run-1",
      workspacePath,
      logPath: `${config.logsRoot}/run-1.log`,
      handoffPath: `${config.handoffsRoot}/run-1.json`,
      status: "completed" as const,
      phase: "completed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancellationRequested: false,
      integration: {
        remoteSessionMode: "off" as const,
        dispatchStatus: "pending" as const,
      },
      workflow: {
        provider: "openspec" as const,
        changeName: "agent-ship-feature-run-1",
      },
      team: {
        orchestratorName: "Hans",
        memberResults: [],
        contributions: [],
        decisions: [],
      },
      prd: {
        title: "Ship Feature",
        version: "1.0.0",
        date: "2026-05-28",
        filePath: `${config.featuresRoot}/ship-feature-v1.0.0-2026-05-28.md`,
        discussionItems: [],
      },
      history: [{ phase: "queued" as const, at: new Date().toISOString() }],
      summary: "done",
    };

    const published = await provider.publishHandoff(run);
    expect(published.status).toBe("skipped");

    const handoff = JSON.parse(await readFile(run.handoffPath, "utf8")) as {
      workflow: { provider: string; changeName?: string };
      projectRoot: string;
      githubRepository?: string;
      prd: { filePath?: string };
    };
    expect(handoff.workflow.provider).toBe("openspec");
    expect(handoff.workflow.changeName).toBe("agent-ship-feature-run-1");
    expect(handoff.projectRoot).toBe(config.projectRoot);
    expect(handoff.githubRepository).toBe("owner/repo");
    expect(handoff.prd.filePath).toContain("ship-feature-v1.0.0-2026-05-28.md");
  });
});
