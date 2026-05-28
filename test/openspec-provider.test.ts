import path from "node:path";
import { mkdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { OpenSpecWorkflowProvider } from "../src/workflows/openspec-provider.js";
import { createTestConfig } from "./helpers.js";

describe("OpenSpecWorkflowProvider", () => {
  it("captures change metadata during preparation", async () => {
    const config = await createTestConfig("openspec-provider");
    const workspacePath = path.join(config.workspaceRoot, "run-1");
    await mkdir(workspacePath, { recursive: true });

    const provider = new OpenSpecWorkflowProvider(config);
    const result = await provider.prepareRun({
      id: "run-1",
      kind: "developer",
      parentRunId: "hans-1",
      personaId: "david",
      baseBranch: "main",
      feature: "Ship workflow swap",
      featureSlug: "ship-workflow-swap",
      featureBranch: "copilot/ship-workflow-swap-run-1",
      workspacePath,
      logPath: path.join(config.logsRoot, "run-1.log"),
      handoffPath: path.join(config.handoffsRoot, "run-1.json"),
      status: "queued",
      phase: "drafting-prd",
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
        title: "Ship Workflow Swap",
        version: "1.0.0",
        date: "2026-05-28",
        filePath: path.join(config.featuresRoot, "ship-workflow-swap-v1.0.0-2026-05-28.md"),
        discussionItems: [],
      },
      history: [{ phase: "queued", at: new Date().toISOString() }],
    });

    expect(result.workflow.provider).toBe("openspec");
    expect(result.workflow.changeName).toContain("agent-ship-workflow-swap");
    expect(result.workflow.applyState).toBe("ready");
    expect(result.workflow.progress?.total).toBe(1);
  });
});
