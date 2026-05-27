import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertTransition } from "../domain/workflow.js";
export class RunStore {
    config;
    constructor(config) {
        this.config = config;
    }
    getRunPath(runId) {
        return path.join(this.config.runsRoot, `${runId}.json`);
    }
    async listRuns() {
        await mkdir(this.config.runsRoot, { recursive: true });
        const entries = await readdir(this.config.runsRoot);
        const runs = await Promise.all(entries
            .filter((entry) => entry.endsWith(".json"))
            .map(async (entry) => {
            const raw = await readFile(path.join(this.config.runsRoot, entry), "utf8");
            return this.normalizeRun(JSON.parse(raw));
        }));
        return runs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    async getRun(runId) {
        const raw = await readFile(this.getRunPath(runId), "utf8");
        return this.normalizeRun(JSON.parse(raw));
    }
    async saveRun(run) {
        await mkdir(this.config.runsRoot, { recursive: true });
        run.updatedAt = new Date().toISOString();
        await writeFile(this.getRunPath(run.id), JSON.stringify(run, null, 2), "utf8");
        return run;
    }
    async updateRun(runId, mutate) {
        const run = await this.getRun(runId);
        const updated = (mutate(run) ?? run);
        return this.saveRun(updated);
    }
    async transitionPhase(runId, nextPhase, message) {
        return this.updateRun(runId, (run) => {
            assertTransition(run.phase, nextPhase);
            run.phase = nextPhase;
            run.history.push({ phase: nextPhase, at: new Date().toISOString(), message });
            if (nextPhase === "completed") {
                run.status = "completed";
                run.completedAt = new Date().toISOString();
            }
            else if (nextPhase === "failed") {
                run.status = "failed";
                run.completedAt = new Date().toISOString();
            }
            else if (nextPhase === "cancelled") {
                run.status = "cancelled";
                run.completedAt = new Date().toISOString();
            }
            else {
                run.status = nextPhase === "queued" ? "queued" : "running";
                run.startedAt ??= new Date().toISOString();
            }
        });
    }
    async deleteRun(runId) {
        await rm(this.getRunPath(runId), { force: true });
    }
    normalizeRun(run) {
        const legacyProvider = run.provider;
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
                provider: this.config.workflow.defaultProvider,
            },
            team: run.team,
        };
    }
}
//# sourceMappingURL=run-store.js.map