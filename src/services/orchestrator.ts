import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { AppConfig, RunRecord, SpawnRequest, SpawnResult, TeamAgreement } from "../domain/types.js";
import { RunLogger } from "../state/run-logger.js";
import { RunStore } from "../state/run-store.js";
import { GitHubProvider } from "../providers/github-provider.js";
import { WorkspaceManager } from "./workspace-manager.js";
import { CopilotProvider } from "../providers/copilot-provider.js";
import { makeRunId, slugify } from "../utils/text.js";
import { createWorkflowProvider } from "../workflows/index.js";
import { DEVELOPER_PERSONAS, HANS_PROFILE } from "../team/personas.js";
import { TeamDeliberationService } from "./team-deliberation.js";

const sourceEntryPath = fileURLToPath(new URL("../index.ts", import.meta.url));
const builtEntryPath = fileURLToPath(new URL("../index.js", import.meta.url));
const MAX_DELIBERATION_ROUNDS = 3;

export class OrchestratorService {
  private readonly store: RunStore;
  private readonly github: GitHubProvider;
  private readonly workspaceManager: WorkspaceManager;
  private readonly copilot: CopilotProvider;
  private readonly deliberation: TeamDeliberationService;

  public constructor(private readonly config: AppConfig) {
    this.store = new RunStore(config);
    this.github = new GitHubProvider(config);
    this.workspaceManager = new WorkspaceManager(config);
    this.copilot = new CopilotProvider(config);
    this.deliberation = new TeamDeliberationService();
  }

  public async spawnRuns(request: SpawnRequest): Promise<SpawnResult> {
    const repository = this.github.resolveRepository(request.repository);
    const runs: RunRecord[] = [];

    for (const feature of request.features) {
      const runId = makeRunId(feature);
      const featureSlug = slugify(feature) || "feature";
      const run: RunRecord = {
        id: runId,
        kind: "orchestrator",
        repository,
        baseBranch: request.baseBranch,
        feature,
        featureSlug,
        featureBranch: `copilot/${featureSlug}-${runId.slice(-8)}`,
        workspacePath: this.workspaceManager.getWorkspacePath(runId),
        logPath: path.join(this.config.logsRoot, `${runId}.log`),
        handoffPath: path.join(this.config.handoffsRoot, `${runId}.json`),
        status: "queued",
        phase: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cancellationRequested: false,
        integration: {
          remoteSessionMode: this.config.copilot.remoteSessionMode,
          dispatchStatus: "pending",
        },
        workflow: {
          provider: this.config.workflow.defaultProvider,
        },
        team: {
          orchestratorName: HANS_PROFILE.name,
          developerRunIds: [],
          memberResults: [],
          deliberationRounds: [],
        },
        history: [{ phase: "queued", at: new Date().toISOString(), message: "Run created." }],
      };

      await this.store.saveRun(run);
      const pid = await this.launchWorker(run.id);
      const updated = await this.store.updateRun(run.id, (record) => {
        record.pid = pid;
        record.status = "running";
      });
      runs.push(updated);
    }

    return { runs };
  }

  public async listRuns(): Promise<RunRecord[]> {
    return this.store.listRuns();
  }

  public async getRun(runId: string): Promise<RunRecord> {
    return this.store.getRun(runId);
  }

  public async cancelRun(runId: string): Promise<RunRecord> {
    const run = await this.store.updateRun(runId, (record) => {
      record.cancellationRequested = true;
    });

    if (run.pid) {
      try {
        process.kill(run.pid);
      } catch {
        // Ignore missing process; the persisted cancellation flag still takes effect on resume.
      }
    }

    return this.store.transitionPhase(runId, "cancelled", "Cancellation requested by operator.");
  }

  public async resumeRun(runId: string): Promise<RunRecord> {
    const run = await this.store.getRun(runId);
    if (run.phase === "completed") {
      return run;
    }

    if (run.pid) {
      try {
        process.kill(run.pid, 0);
        return run;
      } catch {
        // Worker is gone; relaunch.
      }
    }

    const pid = await this.launchWorker(runId);
    return this.store.updateRun(runId, (record) => {
      record.pid = pid;
      record.status = record.phase === "queued" ? "queued" : "running";
      record.cancellationRequested = false;
    });
  }

  public async getLogs(runId: string, tail = 100): Promise<string[]> {
    const run = await this.store.getRun(runId);
    return new RunLogger(run.logPath).tail(tail);
  }

  public async cleanupRun(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    await this.workspaceManager.cleanup(run);
  }

  public async runWorker(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    const logger = new RunLogger(run.logPath);
    await mkdir(path.dirname(run.logPath), { recursive: true });
    await logger.log(`Worker started for ${run.id}.`);

    try {
      if (run.kind === "orchestrator") {
        await this.runHansWorker(run, logger);
      } else {
        await this.runDeveloperWorker(run, logger);
      }

      await this.store.transitionPhase(run.id, "completed", "Run completed.");
      await logger.log("Run completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await logger.log(`Run failed: ${message}`);
      await this.store.updateRun(run.id, (mutableRun) => {
        mutableRun.error = message;
      });
      const latest = await this.store.getRun(run.id);
      if (latest.phase !== "cancelled") {
        await this.store.transitionPhase(run.id, "failed", message);
      }
    } finally {
      const latest = await this.store.getRun(run.id);
      await this.workspaceManager.cleanup(latest);
    }
  }

  private async runHansWorker(run: RunRecord, logger: RunLogger): Promise<void> {
    let current = run;
    current = await this.ensurePhase(current, "preparing-workspace", async (record) => {
      await logger.log("Preparing Hans workspace.");
      await this.workspaceManager.prepareWorkspace(record);
    });

    current = await this.ensurePhase(current, "drafting-spec", async (record) => {
      const workflowProvider = createWorkflowProvider(this.config, record);
      await logger.log(`Running ${workflowProvider.id} preparation stage for Hans.`);
      const result = await workflowProvider.prepareRun(record);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.workflow = { ...mutableRun.workflow, ...result.workflow };
      });
      if (result.logOutput) {
        await logger.log(result.logOutput);
      }
      await this.spawnDeveloperRuns(record, logger);
      await this.waitForDeveloperRuns(record.id, logger);
    });

    current = await this.ensurePhase(current, "implementing", async (record) => {
      const developers = await this.getDeveloperRuns(record.id);
      const memberResults = this.deliberation.createMemberResults(developers);
      const deliberationRounds: TeamAgreement[] = [];
      const roundOne = this.deliberation.evaluateRoundOne(memberResults);
      deliberationRounds.push(roundOne);
      await logger.log(`Hans round 1 average individual score: ${roundOne.score}/100.`);

      let bestAgreement = roundOne;
      for (const round of [2, 3] as const) {
        const mergedAgreement = this.deliberation.deliberateMerge(memberResults, round, roundOne);
        deliberationRounds.push(mergedAgreement);
        if (mergedAgreement.score > bestAgreement.score) {
          bestAgreement = mergedAgreement;
        }
        await logger.log(`Hans round ${round} merged score: ${mergedAgreement.score}/100.`);
        if (mergedAgreement.accepted) {
          bestAgreement = mergedAgreement;
          break;
        }
      }

      const finalAgreement =
        bestAgreement.accepted
          ? bestAgreement
          : this.deliberation.selectBestIndividualFallback(memberResults, roundOne);

      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.team = {
          orchestratorName: HANS_PROFILE.name,
          developerRunIds: developers.map((developer) => developer.id),
          memberResults,
          deliberationRounds,
          finalAgreement,
          finalWorkspacePath:
            mutableRun.team?.finalWorkspacePath ?? this.getFinalWorkspacePath(mutableRun.id),
        };
        mutableRun.summary = finalAgreement.summary;
      });

      if (!finalAgreement.accepted) {
        await logger.log(
          `Hans did not reach 90/100 after ${MAX_DELIBERATION_ROUNDS} rounds; discarding the merge and proceeding with the best individual Round 1 solution from ${finalAgreement.selectedPersonaName}.`,
        );
      }

      const refreshed = await this.prepareFinalImplementationRun(await this.store.getRun(record.id), logger);
      await logger.log("Starting Hans final implementation session.");
      const result = await this.copilot.implement(refreshed, logger);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.integration.copilotSessionId = result.sessionId;
        mutableRun.summary = result.summary ?? mutableRun.summary;
        mutableRun.team = {
          orchestratorName: mutableRun.team?.orchestratorName ?? HANS_PROFILE.name,
          developerRunIds: mutableRun.team?.developerRunIds ?? [],
          memberResults: mutableRun.team?.memberResults ?? [],
          deliberationRounds: mutableRun.team?.deliberationRounds ?? [],
          finalAgreement: mutableRun.team?.finalAgreement,
          finalWorkspacePath: refreshed.workspacePath,
        };
      });
    });

    await this.ensurePhase(current, "handoff", async (record) => {
      const finalRun = await this.getFinalImplementationRun(await this.store.getRun(record.id));
      const workflowProvider = createWorkflowProvider(this.config, finalRun);
      await logger.log(`Running ${workflowProvider.id} handoff stage for Hans.`);
      const result = await workflowProvider.finalizeRun(finalRun);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.workflow = { ...mutableRun.workflow, ...result.workflow };
      });
      if (result.logOutput) {
        await logger.log(result.logOutput);
      }

      const published = await this.github.publishHandoff(await this.store.getRun(record.id));
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.integration.dispatchStatus =
          published.status === "published" ? "published" : "skipped";
        mutableRun.integration.dispatchResponse = published.detail;
      });
      await logger.log(published.detail);
    });
  }

  private async runDeveloperWorker(run: RunRecord, logger: RunLogger): Promise<void> {
    let current = run;
    current = await this.ensurePhase(current, "preparing-workspace", async (record) => {
      await logger.log(`Preparing developer workspace for ${record.personaId}.`);
      await this.workspaceManager.prepareWorkspace(record);
    });

    current = await this.ensurePhase(current, "drafting-spec", async (record) => {
      const workflowProvider = createWorkflowProvider(this.config, record);
      await logger.log(`Running ${workflowProvider.id} preparation stage for ${record.personaId}.`);
      const result = await workflowProvider.prepareRun(record);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.workflow = { ...mutableRun.workflow, ...result.workflow };
      });
      if (result.logOutput) {
        await logger.log(result.logOutput);
      }
    });

    current = await this.ensurePhase(current, "implementing", async (record) => {
      await logger.log(`Starting developer implementation session for ${record.personaId}.`);
      const result = await this.copilot.implement(record, logger);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.integration.copilotSessionId = result.sessionId;
        mutableRun.summary = result.summary;
      });
    });

    await this.ensurePhase(current, "handoff", async (record) => {
      const workflowProvider = createWorkflowProvider(this.config, record);
      await logger.log(`Running ${workflowProvider.id} handoff stage for ${record.personaId}.`);
      const result = await workflowProvider.finalizeRun(record);
      await this.store.updateRun(record.id, (mutableRun) => {
        mutableRun.workflow = { ...mutableRun.workflow, ...result.workflow };
      });
      if (result.logOutput) {
        await logger.log(result.logOutput);
      }
    });
  }

  private async ensurePhase(
    run: RunRecord,
    targetPhase: Exclude<RunRecord["phase"], "queued" | "completed" | "failed" | "cancelled">,
    work: (run: RunRecord) => Promise<void>,
  ): Promise<RunRecord> {
    if (run.cancellationRequested) {
      return this.store.transitionPhase(run.id, "cancelled", "Cancelled before phase start.");
    }

    if (run.phase === targetPhase) {
      await work(run);
      return this.store.getRun(run.id);
    }

    const phaseOrder = ["queued", "preparing-workspace", "drafting-spec", "implementing", "handoff"];
    if (phaseOrder.indexOf(run.phase) > phaseOrder.indexOf(targetPhase)) {
      return run;
    }

    const moved = await this.store.transitionPhase(run.id, targetPhase, `Entering ${targetPhase}.`);
    await work(moved);
    return this.store.getRun(run.id);
  }

  private async launchWorker(runId: string): Promise<number> {
    const currentModulePath = fileURLToPath(import.meta.url);
    const workerArgs = currentModulePath.endsWith(".ts")
      ? ["--import", "tsx", sourceEntryPath, "__run-worker", runId]
      : [builtEntryPath, "__run-worker", runId];

    const child = spawn(process.execPath, workerArgs, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: process.env,
    });
    child.unref();
    return child.pid ?? 0;
  }

  private async spawnDeveloperRuns(parentRun: RunRecord, logger: RunLogger): Promise<void> {
    const repository = parentRun.repository;
    const developerRuns: RunRecord[] = [];

    for (const persona of DEVELOPER_PERSONAS) {
      const runId = makeRunId(`${parentRun.feature}-${persona.id}`);
      const developerRun: RunRecord = {
        id: runId,
        kind: "developer",
        parentRunId: parentRun.id,
        personaId: persona.id,
        repository,
        baseBranch: parentRun.baseBranch,
        feature: parentRun.feature,
        featureSlug: parentRun.featureSlug,
        featureBranch: `copilot/${parentRun.featureSlug}-${persona.id}-${runId.slice(-8)}`,
        workspacePath: this.workspaceManager.getWorkspacePath(runId),
        logPath: path.join(this.config.logsRoot, `${runId}.log`),
        handoffPath: path.join(this.config.handoffsRoot, `${runId}.json`),
        status: "queued",
        phase: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cancellationRequested: false,
        integration: {
          remoteSessionMode: this.config.copilot.remoteSessionMode,
          dispatchStatus: "pending",
        },
        workflow: {
          provider: this.config.workflow.defaultProvider,
        },
        history: [{ phase: "queued", at: new Date().toISOString(), message: `Developer run created for ${persona.name}.` }],
      };

      await this.store.saveRun(developerRun);
      const pid = await this.launchWorker(developerRun.id);
      const updated = await this.store.updateRun(developerRun.id, (record) => {
        record.pid = pid;
        record.status = "running";
      });
      developerRuns.push(updated);
      await logger.log(`Spawned developer ${persona.name} as run ${updated.id}.`);
    }

    await this.store.updateRun(parentRun.id, (record) => {
      record.team = {
        orchestratorName: HANS_PROFILE.name,
        developerRunIds: developerRuns.map((developer) => developer.id),
        memberResults: record.team?.memberResults ?? [],
        deliberationRounds: record.team?.deliberationRounds ?? [],
        finalAgreement: record.team?.finalAgreement,
      };
    });
  }

  private async waitForDeveloperRuns(parentRunId: string, logger: RunLogger): Promise<void> {
    while (true) {
      const developers = await this.getDeveloperRuns(parentRunId);
      if (
        developers.length === DEVELOPER_PERSONAS.length &&
        developers.every((developer) =>
          ["completed", "failed", "cancelled"].includes(developer.status),
        )
      ) {
        await logger.log("All developer runs finished.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async getDeveloperRuns(parentRunId: string): Promise<RunRecord[]> {
    const runs = await this.store.listRuns();
    return runs.filter((run) => run.parentRunId === parentRunId);
  }

  private getFinalWorkspacePath(runId: string): string {
    return path.join(this.config.workspaceRoot, `${runId}-final`);
  }

  private async prepareFinalImplementationRun(run: RunRecord, logger: RunLogger): Promise<RunRecord> {
    const finalWorkspacePath = run.team?.finalWorkspacePath ?? this.getFinalWorkspacePath(run.id);
    const finalRun = {
      ...run,
      workspacePath: finalWorkspacePath,
    };

    await logger.log(`Preparing dedicated final workspace at ${finalWorkspacePath}.`);
    await this.workspaceManager.prepareWorkspaceAt(finalRun, finalWorkspacePath);

    const workflowProvider = createWorkflowProvider(this.config, finalRun);
    const result = await workflowProvider.prepareRun(finalRun);
    await this.store.updateRun(run.id, (mutableRun) => {
      mutableRun.workflow = { ...mutableRun.workflow, ...result.workflow };
      mutableRun.team = {
        orchestratorName: mutableRun.team?.orchestratorName ?? HANS_PROFILE.name,
        developerRunIds: mutableRun.team?.developerRunIds ?? [],
        memberResults: mutableRun.team?.memberResults ?? [],
        deliberationRounds: mutableRun.team?.deliberationRounds ?? [],
        finalAgreement: mutableRun.team?.finalAgreement,
        finalWorkspacePath,
      };
    });
    if (result.logOutput) {
      await logger.log(result.logOutput);
    }

    return {
      ...(await this.store.getRun(run.id)),
      workspacePath: finalWorkspacePath,
    };
  }

  private async getFinalImplementationRun(run: RunRecord): Promise<RunRecord> {
    if (!run.team?.finalWorkspacePath) {
      return run;
    }

    return {
      ...run,
      workspacePath: run.team.finalWorkspacePath,
    };
  }
}
