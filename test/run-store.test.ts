import { describe, expect, it } from "vitest";
import { RunStore } from "../src/state/run-store.js";
import { createTestConfig } from "./helpers.js";

describe("RunStore", () => {
  it("persists and reloads a run record", async () => {
    const config = await createTestConfig("run-store");
    const store = new RunStore(config);

    await store.saveRun({
      id: "run-1",
      kind: "orchestrator",
      baseBranch: "main",
      feature: "Add API",
      featureSlug: "add-api",
      featureBranch: "copilot/add-api-run-1",
      workspacePath: `${config.workspaceRoot}/run-1`,
      logPath: `${config.logsRoot}/run-1.log`,
      handoffPath: `${config.handoffsRoot}/run-1.json`,
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
        title: "Add API",
        version: "1.0.0",
        date: "2026-05-28",
        filePath: `${config.featuresRoot}/add-api-v1.0.0-2026-05-28.md`,
        discussionItems: [],
      },
      history: [{ phase: "queued", at: new Date().toISOString() }],
    });

    const reloaded = await store.getRun("run-1");
    expect(reloaded.feature).toBe("Add API");
    expect(reloaded.prd?.title).toBe("Add API");
    expect((await store.listRuns())).toHaveLength(1);
  });
});
