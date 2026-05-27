import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { GitHubProvider } from "../src/providers/github-provider.js";
import { createTestConfig } from "./helpers.js";

describe("GitHubProvider", () => {
  it("writes a handoff artifact when dispatch is skipped", async () => {
    const config = await createTestConfig("github-provider");
    const provider = new GitHubProvider(config);
    const run = {
      id: "run-1",
      kind: "orchestrator" as const,
      repository: {
        input: "owner/repo",
        cloneUrl: "https://github.com/owner/repo.git",
        owner: "owner",
        name: "repo",
        provider: "github" as const,
      },
      baseBranch: "main",
      feature: "Ship feature",
      featureSlug: "ship-feature",
      featureBranch: "copilot/ship-feature-run-1",
      workspacePath: config.workspaceRoot,
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
        developerRunIds: ["dev-1"],
        memberResults: [],
        deliberationRounds: [],
      },
      history: [{ phase: "queued" as const, at: new Date().toISOString() }],
      summary: "done",
    };

    const published = await provider.publishHandoff(run);
    expect(published.status).toBe("skipped");

    const handoff = JSON.parse(await readFile(run.handoffPath, "utf8")) as {
      workflow: { provider: string; changeName?: string };
    };
    expect(handoff.workflow.provider).toBe("openspec");
    expect(handoff.workflow.changeName).toBe("agent-ship-feature-run-1");
  });
});
