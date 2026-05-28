import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertTransition } from "../domain/workflow.js";
import type { AppConfig, RunRecord, WorkflowPhase } from "../domain/types.js";

export class RunStore {
  public constructor(private readonly config: AppConfig) {}

  public getRunPath(runId: string): string {
    return path.join(this.config.runsRoot, `${runId}.json`);
  }

  public async listRuns(): Promise<RunRecord[]> {
    await mkdir(this.config.runsRoot, { recursive: true });
    const entries = await readdir(this.config.runsRoot);
    const runs = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          const raw = await readFile(path.join(this.config.runsRoot, entry), "utf8");
          return this.normalizeRun(JSON.parse(raw) as RunRecord);
        }),
    );

    return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  public async getRun(runId: string): Promise<RunRecord> {
    const raw = await readFile(this.getRunPath(runId), "utf8");
    return this.normalizeRun(JSON.parse(raw) as RunRecord);
  }

  public async saveRun(run: RunRecord): Promise<RunRecord> {
    await mkdir(this.config.runsRoot, { recursive: true });
    run.updatedAt = new Date().toISOString();
    await writeFile(this.getRunPath(run.id), JSON.stringify(run, null, 2), "utf8");
    return run;
  }

  public async updateRun(
    runId: string,
    mutate: (run: RunRecord) => RunRecord | void,
  ): Promise<RunRecord> {
    const run = await this.getRun(runId);
    const updated = (mutate(run) ?? run) as RunRecord;
    return this.saveRun(updated);
  }

  public async transitionPhase(
    runId: string,
    nextPhase: WorkflowPhase,
    message?: string,
  ): Promise<RunRecord> {
    return this.updateRun(runId, (run) => {
      assertTransition(run.phase, nextPhase);
      run.phase = nextPhase;
      run.history.push({ phase: nextPhase, at: new Date().toISOString(), message });

      if (nextPhase === "completed") {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
      } else if (nextPhase === "failed") {
        run.status = "failed";
        run.completedAt = new Date().toISOString();
      } else if (nextPhase === "cancelled") {
        run.status = "cancelled";
        run.completedAt = new Date().toISOString();
      } else {
        run.status = nextPhase === "queued" ? "queued" : "running";
        run.startedAt ??= new Date().toISOString();
      }
    });
  }

  public async deleteRun(runId: string): Promise<void> {
    await rm(this.getRunPath(runId), { force: true });
  }

  private normalizeRun(run: RunRecord): RunRecord {
    const legacyProvider = (run as RunRecord & {
      provider?: {
        remoteSessionMode?: RunRecord["integration"]["remoteSessionMode"];
        dispatchStatus?: RunRecord["integration"]["dispatchStatus"];
        copilotSessionId?: string;
        dispatchResponse?: string;
      };
    }).provider;

    return {
      ...run,
      kind: run.kind ?? "orchestrator",
      integration: run.integration ?? {
        remoteSessionMode: legacyProvider?.remoteSessionMode ?? this.config.copilot.remoteSessionMode,
        dispatchStatus: legacyProvider?.dispatchStatus ?? "pending",
        copilotSessionId: legacyProvider?.copilotSessionId,
        dispatchResponse: legacyProvider?.dispatchResponse,
      },
      workflow: run.workflow ?? {
        provider: "openspec",
      },
      team: run.team ?? {
        orchestratorName: "Hans",
        memberResults: [],
        contributions: [],
        decisions: [],
      },
      prd: run.prd ?? {
        discussionItems: [],
      },
    };
  }
}
