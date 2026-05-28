import { z } from "zod";
import { RunLogger } from "../state/run-logger.js";
import { RunStore } from "../state/run-store.js";
import { GitHubProvider } from "../providers/github-provider.js";
import { WorkspaceManager } from "./workspace-manager.js";
import { CopilotProvider } from "../providers/copilot-provider.js";
import { makeRunId, slugify } from "../utils/text.js";
import { createWorkflowProvider } from "../workflows/index.js";
import { DEVELOPER_PERSONAS, HANS_PROFILE } from "../team/personas.js";
import { TeamDeliberationService } from "./team-deliberation.js";
import { PrdService } from "./prd-service.js";
import { execFile } from "../utils/process.js";
const MODERATION_RESPONSE_SCHEMA = z.object({
    summary: z.string().min(1),
    requiresFollowUp: z.boolean().default(false),
    followUpPrompt: z.string().optional(),
});
function extractLastJsonBlock(output) {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) {
        throw new Error(`Expected JSON output from Hans, received: ${output}`);
    }
    return output.slice(start, end + 1);
}
function shorten(message, maxLength = 140) {
    const normalized = message.replace(/\s+/g, " ").trim();
    return normalized.length <= maxLength
        ? normalized
        : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
export class OrchestratorService {
    config;
    options;
    store;
    github;
    workspaceManager;
    copilot;
    deliberation;
    prd;
    constructor(config, options = {}) {
        this.config = config;
        this.options = options;
        this.store = new RunStore(config);
        this.github = new GitHubProvider(config);
        this.workspaceManager = new WorkspaceManager(config);
        this.copilot = new CopilotProvider(config);
        this.deliberation = new TeamDeliberationService();
        this.prd = new PrdService(config);
    }
    async spawnRuns(request) {
        const baseBranch = request.baseBranch ?? (await this.resolveBaseBranch(this.config.projectRoot));
        const runs = [];
        for (const feature of request.features) {
            const runId = makeRunId(feature);
            const featureSlug = slugify(feature) || "feature";
            const timestamp = new Date().toISOString();
            const run = {
                id: runId,
                kind: "orchestrator",
                baseBranch,
                feature,
                featureSlug,
                featureBranch: `copilot/${featureSlug}-${runId.slice(-8)}`,
                workspacePath: this.workspaceManager.getWorkspacePath(runId),
                logPath: `${this.config.logsRoot}\\${runId}.log`,
                handoffPath: `${this.config.handoffsRoot}\\${runId}.json`,
                status: "queued",
                phase: "queued",
                createdAt: timestamp,
                updatedAt: timestamp,
                cancellationRequested: false,
                integration: {
                    remoteSessionMode: this.config.copilot.remoteSessionMode,
                    dispatchStatus: "pending",
                },
                workflow: {
                    provider: "openspec",
                },
                team: {
                    orchestratorName: HANS_PROFILE.name,
                    memberResults: [],
                    contributions: [],
                    decisions: [],
                },
                prd: this.prd.createInitialState({
                    id: runId,
                    kind: "orchestrator",
                    baseBranch,
                    feature,
                    featureSlug,
                    featureBranch: `copilot/${featureSlug}-${runId.slice(-8)}`,
                    workspacePath: this.workspaceManager.getWorkspacePath(runId),
                    logPath: `${this.config.logsRoot}\\${runId}.log`,
                    handoffPath: `${this.config.handoffsRoot}\\${runId}.json`,
                    status: "queued",
                    phase: "queued",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    cancellationRequested: false,
                    integration: {
                        remoteSessionMode: this.config.copilot.remoteSessionMode,
                        dispatchStatus: "pending",
                    },
                    workflow: {
                        provider: "openspec",
                    },
                    team: {
                        orchestratorName: HANS_PROFILE.name,
                        memberResults: [],
                        contributions: [],
                        decisions: [],
                    },
                    history: [],
                }),
                history: [{ phase: "queued", at: timestamp, message: "Run created." }],
            };
            await this.store.saveRun(run);
            this.announce(`Run ${run.id} started.`);
            await this.runWorker(run.id);
            runs.push(await this.store.getRun(run.id));
        }
        return { runs };
    }
    async listRuns() {
        return this.store.listRuns();
    }
    async getRun(runId) {
        return this.store.getRun(runId);
    }
    async cancelRun(runId) {
        const run = await this.store.updateRun(runId, (record) => {
            record.cancellationRequested = true;
        });
        if (run.phase === "completed" || run.phase === "failed" || run.phase === "cancelled") {
            return run;
        }
        return this.store.transitionPhase(runId, "cancelled", "Cancellation requested by operator.");
    }
    async resumeRun(runId) {
        const run = await this.store.getRun(runId);
        if (run.phase === "completed") {
            return run;
        }
        await this.runWorker(runId);
        return this.store.getRun(runId);
    }
    async getLogs(runId, tail = 100) {
        const run = await this.store.getRun(runId);
        return new RunLogger(run.logPath).tail(tail);
    }
    async cleanupRun(runId) {
        const run = await this.store.getRun(runId);
        await this.workspaceManager.cleanup(run);
    }
    async runWorker(runId) {
        const run = await this.store.getRun(runId);
        const logger = new RunLogger(run.logPath);
        await logger.log(`Run started for ${run.id}.`);
        try {
            await this.runHansWorker(run, logger);
            await this.store.transitionPhase(run.id, "completed", "Run completed.");
            await logger.log("Run completed.");
            this.announce(`Run ${run.id} completed.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await logger.log(`Run failed: ${message}`);
            await this.store.updateRun(run.id, (mutableRun) => {
                mutableRun.error = message;
            });
            const latest = await this.store.getRun(run.id);
            if (latest.phase !== "cancelled") {
                await this.store.transitionPhase(run.id, "failed", message);
            }
            this.announce(`Run ${run.id} failed.`);
        }
        finally {
            const latest = await this.store.getRun(run.id);
            await this.workspaceManager.cleanup(latest);
        }
    }
    async runHansWorker(run, logger) {
        let current = run;
        current = await this.ensurePhase(current, "preparing-workspace", async (record) => {
            this.announce("Stage: workspace.");
            await logger.log("Preparing workspace.");
            await this.workspaceManager.prepareWorkspace(record);
        });
        current = await this.ensurePhase(current, "drafting-prd", async (record) => {
            this.announce("Stage: PRD.");
            await this.runCouncilLoop(record, logger);
        });
        current = await this.ensurePhase(current, "implementing", async (record) => {
            const refreshed = await this.store.getRun(record.id);
            const workflowProvider = createWorkflowProvider(this.config, refreshed);
            this.announce("Stage: OpenSpec.");
            await logger.log("Preparing OpenSpec implementation stage.");
            const prepareResult = await workflowProvider.prepareRun(refreshed);
            await this.store.updateRun(record.id, (mutableRun) => {
                mutableRun.workflow = { ...mutableRun.workflow, ...prepareResult.workflow };
            });
            if (prepareResult.logOutput) {
                await logger.log(prepareResult.logOutput);
            }
            this.announce("Stage: build.");
            const implementationRun = await this.store.getRun(record.id);
            const result = await this.copilot.implement(implementationRun, logger);
            await this.store.updateRun(record.id, (mutableRun) => {
                mutableRun.integration.copilotSessionId = result.sessionId;
                mutableRun.summary = result.summary ?? mutableRun.summary;
            });
        });
        await this.ensurePhase(current, "handoff", async (record) => {
            const refreshed = await this.store.getRun(record.id);
            const workflowProvider = createWorkflowProvider(this.config, refreshed);
            this.announce("Stage: handoff.");
            const result = await workflowProvider.finalizeRun(refreshed);
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
            this.announce(shorten(published.detail));
        });
    }
    async runCouncilLoop(run, logger) {
        const current = await this.store.getRun(run.id);
        const items = current.prd?.discussionItems ?? [];
        for (const item of items) {
            if ((item.roundsCompleted ?? 0) >= item.maxRounds && item.resolution) {
                continue;
            }
            this.announce(`Agenda: ${item.title}.`);
            const roundOne = await this.collectContributions(current.id, item, 1, item.prompt, logger);
            const firstModeration = await this.moderateItem(current.id, item, 1, roundOne, logger);
            let decision = firstModeration;
            let roundsUsed = 1;
            if (firstModeration.requiresFollowUp && item.maxRounds > 1) {
                this.announce(`Round 2 on ${item.title}.`);
                const followUpPrompt = firstModeration.followUpPrompt ?? item.prompt;
                const roundTwo = await this.collectContributions(current.id, item, 2, followUpPrompt, logger);
                decision = await this.moderateItem(current.id, item, 2, [...roundOne, ...roundTwo], logger);
                roundsUsed = 2;
            }
            await this.store.updateRun(current.id, (mutableRun) => {
                const nextTeam = mutableRun.team ?? {
                    orchestratorName: HANS_PROFILE.name,
                    memberResults: [],
                    contributions: [],
                    decisions: [],
                };
                nextTeam.decisions = [
                    ...nextTeam.decisions.filter((existing) => existing.itemId !== item.id),
                    this.deliberation.createDecision(item, roundsUsed, decision.summary, roundsUsed === 1 ? decision.followUpPrompt : undefined),
                ];
                nextTeam.memberResults = this.deliberation.createMemberResults(nextTeam.contributions);
                mutableRun.team = nextTeam;
                const prd = mutableRun.prd ?? this.prd.createInitialState(mutableRun);
                prd.discussionItems = prd.discussionItems.map((candidate) => candidate.id === item.id
                    ? {
                        ...candidate,
                        roundsCompleted: roundsUsed,
                        resolution: decision.summary,
                        followUpPrompt: roundsUsed === 1 ? decision.followUpPrompt : undefined,
                    }
                    : candidate);
                mutableRun.prd = prd;
            });
            this.announce(shorten(`Hans merged ${item.title}. ${decision.summary}`));
        }
        const withDecisions = await this.store.getRun(run.id);
        this.announce("Hans is writing the PRD.");
        const prdPrompt = this.buildPrdPrompt(withDecisions);
        const prdResult = await this.copilot.sendPrompt(withDecisions, logger, prdPrompt, `${run.id}-prd`);
        const markdown = prdResult.response?.trim();
        if (!markdown) {
            throw new Error("Hans did not produce a PRD draft.");
        }
        this.prd.validateDocument(markdown);
        await this.prd.writeDocument(withDecisions.prd ?? this.prd.createInitialState(withDecisions), markdown);
        const workspacePrdPath = await this.prd.syncDocumentToWorkspace(withDecisions, withDecisions.prd ?? this.prd.createInitialState(withDecisions), markdown);
        await this.store.updateRun(run.id, (mutableRun) => {
            const prd = mutableRun.prd ?? this.prd.createInitialState(mutableRun);
            prd.finalDocument = markdown;
            prd.synopsis = this.prd.buildFinalSynopsis(mutableRun.team?.decisions ?? []);
            prd.workspaceFilePath = workspacePrdPath;
            mutableRun.prd = prd;
            mutableRun.summary = `PRD ready at ${prd.filePath}.`;
        });
        this.announce("PRD saved.");
    }
    async collectContributions(runId, item, round, agendaPrompt, logger) {
        const contributions = [];
        for (const persona of DEVELOPER_PERSONAS) {
            this.announce(`Hans calls ${persona.name}.`);
            const run = await this.store.getRun(runId);
            const prompt = this.buildContributionPrompt(run, item, round, agendaPrompt, persona);
            const result = await this.copilot.sendPrompt(run, logger, prompt, `${run.id}-${persona.id}-${item.id}-r${round}`);
            const content = result.response?.trim();
            if (!content) {
                throw new Error(`${persona.name} did not return a PRD contribution.`);
            }
            const contribution = this.deliberation.createContribution(item, persona.id, persona.name, round, content);
            contributions.push(contribution);
            await this.store.updateRun(runId, (mutableRun) => {
                const nextTeam = mutableRun.team ?? {
                    orchestratorName: HANS_PROFILE.name,
                    memberResults: [],
                    contributions: [],
                    decisions: [],
                };
                nextTeam.contributions = [...nextTeam.contributions, contribution];
                nextTeam.memberResults = this.deliberation.createMemberResults(nextTeam.contributions);
                mutableRun.team = nextTeam;
            });
        }
        return contributions;
    }
    async moderateItem(runId, item, round, contributions, logger) {
        const run = await this.store.getRun(runId);
        const prompt = this.buildModerationPrompt(run, item, round, contributions);
        const result = await this.copilot.sendPrompt(run, logger, prompt, `${run.id}-hans-${item.id}-r${round}`);
        const content = result.response?.trim();
        if (!content) {
            throw new Error(`Hans did not return a moderation decision for ${item.title}.`);
        }
        return MODERATION_RESPONSE_SCHEMA.parse(JSON.parse(extractLastJsonBlock(content)));
    }
    buildContributionPrompt(run, item, round, agendaPrompt, persona) {
        const priorDecisions = run.team?.decisions.map((decision) => `- ${decision.itemTitle}: ${decision.summary}`) ?? [];
        return [
            `You are ${persona.name}, seated at Hans's circular PRD table.`,
            `Persona title: ${persona.title}.`,
            persona.summary,
            `Working style: ${persona.style}`,
            `Value focus: ${persona.valueFocus}`,
            "",
            `Feature request: ${run.feature}`,
            `Agenda item: ${item.title}`,
            `Round: ${round}`,
            `Agenda prompt: ${agendaPrompt}`,
            "",
            "Council rules:",
            "1. You are drafting a PRD only.",
            "2. Do not create code, edit files, or run OpenSpec.",
            "3. Contribute concrete product and architecture ideas that Hans can merge.",
            "4. Keep the answer focused on this agenda item.",
            "",
            ...(priorDecisions.length ? ["Decisions already closed:", ...priorDecisions, ""] : []),
            "Reply in markdown with these headings exactly:",
            "## Proposal",
            "## Decisions",
            "## Risks",
            "## Open Questions",
        ].join("\n");
    }
    buildModerationPrompt(run, item, round, contributions) {
        return [
            "You are Hans moderating the OS Agents circular PRD table.",
            `Feature request: ${run.feature}`,
            `Agenda item: ${item.title}`,
            `Round under review: ${round}`,
            "",
            this.deliberation.buildDiscussionSnapshot(item, contributions),
            "",
            "Decide whether the item is clear enough to close now.",
            "A second round is allowed only when the item still has material gaps.",
            "Never allow more than 2 rounds for the item.",
            "",
            "Respond with JSON only:",
            "{",
            '  "summary": "short merged decision",',
            '  "requiresFollowUp": true,',
            '  "followUpPrompt": "targeted follow-up question only when needed"',
            "}",
            "",
            "If this is round 2, set requiresFollowUp to false.",
        ].join("\n");
    }
    buildPrdPrompt(run) {
        const prd = run.prd ?? this.prd.createInitialState(run);
        const decisions = run.team?.decisions.map((decision) => `- ${decision.itemTitle}: ${decision.summary}`) ?? [];
        const contributions = run.team?.contributions.map((contribution) => `### ${contribution.name} / ${contribution.itemTitle} / round ${contribution.round}\n${contribution.content}`) ?? [];
        return [
            "You are Hans, writing the final PRD for OS Agents.",
            `PRD title: ${prd.title ?? run.feature}`,
            `PRD version: ${prd.version ?? "1.0.0"}`,
            `PRD date: ${prd.date ?? new Date().toISOString().slice(0, 10)}`,
            `Feature request: ${run.feature}`,
            `Output file: ${prd.filePath ?? "features/<feature>.md"}`,
            "",
            "Closed council decisions:",
            ...decisions,
            "",
            "Full council material:",
            ...contributions,
            "",
            "Write a complete markdown PRD that follows these mandatory rules:",
            ...this.prd.buildArc42Checklist().map((line) => `- ${line}`),
            "",
            "Use these headings exactly:",
            "# PRD: <title>",
            "## Metadata",
            "## 1. Introduction and Goals",
            "## 2. Constraints",
            "## 3. Context and Scope",
            "## 4. Solution Strategy",
            "## 5. Building Block View",
            "## 6. Runtime View",
            "## 7. Deployment View",
            "## 8. Crosscutting Concepts",
            "## 9. Architectural Decisions",
            "## 10. Quality Requirements",
            "## 11. Risks and Technical Debt",
            "## 12. Glossary",
            "## Delivery Plan",
            "## Acceptance Criteria",
            "",
            "Embed PlantUML C4 diagrams in fenced ```plantuml blocks.",
            "Include at least a System Context diagram, a Container diagram, and a Component diagram.",
            "Do not return explanations before or after the markdown document.",
        ].join("\n");
    }
    async ensurePhase(run, targetPhase, work) {
        if (run.cancellationRequested) {
            return this.store.transitionPhase(run.id, "cancelled", "Cancelled before phase start.");
        }
        if (run.phase === targetPhase) {
            await work(run);
            return this.store.getRun(run.id);
        }
        const phaseOrder = ["queued", "preparing-workspace", "drafting-prd", "implementing", "handoff"];
        if (phaseOrder.indexOf(run.phase) > phaseOrder.indexOf(targetPhase)) {
            return run;
        }
        const moved = await this.store.transitionPhase(run.id, targetPhase, `Entering ${targetPhase}.`);
        await work(moved);
        return this.store.getRun(run.id);
    }
    async resolveBaseBranch(repositoryPath) {
        try {
            const result = await execFile("git", ["branch", "--show-current"], { cwd: repositoryPath });
            return result.stdout.trim() || "main";
        }
        catch {
            return "main";
        }
    }
    announce(message) {
        if (this.options.liveOutput) {
            console.log(shorten(message));
        }
    }
}
//# sourceMappingURL=orchestrator.js.map