import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppConfig } from "../src/domain/types.js";

export async function createTestConfig(name: string): Promise<AppConfig> {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), `${name}-`));
  return {
    stateRoot,
    workspaceRoot: path.join(stateRoot, "workspaces"),
    runsRoot: path.join(stateRoot, "runs"),
    logsRoot: path.join(stateRoot, "logs"),
    handoffsRoot: path.join(stateRoot, "handoffs"),
    retention: {
      completed: true,
      failed: true,
      cancelled: true,
    },
    workflow: {
      defaultProvider: "openspec",
      openspec: {
        changePrefix: "agent",
        createChangeCommand: 'echo "{\"changeName\":\"{changeName}\"}"',
        statusCommand:
          'echo "{\"changeName\":\"{changeName}\",\"isComplete\":false,\"artifacts\":[{\"id\":\"proposal\",\"status\":\"ready\"}]}"',
        applyCommand:
          'echo "{\"state\":\"ready\",\"progress\":{\"total\":1,\"complete\":0,\"remaining\":1},\"changeDir\":\"openspec/changes/{changeName}\",\"instruction\":\"Read context files.\"}"',
        handoffCommand:
          'echo "{\"changeName\":\"{changeName}\",\"isComplete\":false,\"artifacts\":[{\"id\":\"tasks\",\"status\":\"done\"}]}"',
      },
      speckit: {
        draftCommand: 'echo "drafted {feature}"',
        handoffCommand: 'echo "handoff {runId}"',
      },
    },
    github: {
      apiBaseUrl: "https://api.github.com",
      dispatchEventType: "openspec_orchestrator_handoff",
      preferSsh: false,
    },
    copilot: {
      model: "gpt-5.4",
      logLevel: "info",
      baseDirectory: path.join(stateRoot, "copilot-home"),
      remoteSessionMode: "off",
    },
  };
}
