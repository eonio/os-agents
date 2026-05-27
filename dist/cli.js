import { Command } from "commander";
import { loadConfig } from "./config.js";
import { OrchestratorService } from "./services/orchestrator.js";
function collectFeature(value, previous) {
    previous.push(value);
    return previous;
}
function formatRun(run) {
    const repository = run.repository.owner && run.repository.name
        ? `${run.repository.owner}/${run.repository.name}`
        : run.repository.input;
    return [
        `${run.id} [${run.status}]`,
        `  kind: ${run.kind}`,
        ...(run.personaId ? [`  persona: ${run.personaId}`] : []),
        ...(run.parentRunId ? [`  parent: ${run.parentRunId}`] : []),
        `  repo: ${repository}`,
        `  workflow: ${run.workflow.provider}`,
        ...(run.workflow.changeName ? [`  change: ${run.workflow.changeName}`] : []),
        ...(run.team?.finalAgreement
            ? [`  agreement: ${run.team.finalAgreement.score}/100 (${run.team.finalAgreement.accepted ? "accepted" : "pending"})`]
            : []),
        `  phase: ${run.phase}`,
        `  base: ${run.baseBranch}`,
        `  branch: ${run.featureBranch}`,
        `  workspace: ${run.workspacePath}`,
    ].join("\n");
}
function output(data, asJson) {
    if (asJson) {
        console.log(JSON.stringify(data, null, 2));
        return;
    }
    if (Array.isArray(data)) {
        console.log(data.join("\n"));
        return;
    }
    console.log(String(data));
}
export async function runCli(argv = process.argv) {
    const program = new Command();
    program
        .name("os-agents")
        .description("Headless multi-agent orchestrator for OpenSpec workflows and GitHub Copilot SDK.")
        .option("-c, --config <path>", "Path to a YAML or JSON config file.");
    program
        .command("spawn")
        .description("Spawn one or more Hans-led feature teams for a repository.")
        .requiredOption("-r, --repo <repository>", "GitHub owner/repo, URL, or local git path.")
        .requiredOption("-b, --branch <branch>", "Initial branch cloned for every agent.")
        .requiredOption("-f, --feature <feature>", "Feature request for an agent.", collectFeature, [])
        .option("--json", "Emit machine-readable JSON.")
        .action(async (options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const result = await orchestrator.spawnRuns({
            repository: options.repo,
            baseBranch: options.branch,
            features: options.feature,
        });
        output(options.json ? result.runs : result.runs.map((run) => formatRun(run)), Boolean(options.json));
    });
    program
        .command("list")
        .description("List all known team and developer runs.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const runs = await orchestrator.listRuns();
        output(options.json ? runs : runs.map((run) => formatRun(run)), Boolean(options.json));
    });
    program
        .command("status [runId]")
        .description("Show one run or all runs, including team and persona metadata.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        if (runId) {
            const run = await orchestrator.getRun(runId);
            output(options.json ? run : formatRun(run), Boolean(options.json));
            return;
        }
        const runs = await orchestrator.listRuns();
        output(options.json ? runs : runs.map((run) => formatRun(run)), Boolean(options.json));
    });
    program
        .command("logs <runId>")
        .description("Show recent log lines for a run.")
        .option("--tail <lines>", "How many lines to show.", "100")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const lines = await orchestrator.getLogs(runId, Number(options.tail));
        output(options.json ? lines : lines, Boolean(options.json));
    });
    program
        .command("cancel <runId>")
        .description("Cancel a run and stop its worker if it is active.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const run = await orchestrator.cancelRun(runId);
        output(options.json ? run : formatRun(run), Boolean(options.json));
    });
    program
        .command("resume <runId>")
        .description("Resume a run after a restart or worker failure.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const run = await orchestrator.resumeRun(runId);
        output(options.json ? run : formatRun(run), Boolean(options.json));
    });
    program
        .command("cleanup <runId>")
        .description("Apply workspace retention rules to a run immediately.")
        .action(async (runId, _options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        await orchestrator.cleanupRun(runId);
        console.log(`Cleanup applied for ${runId}.`);
    });
    program
        .command("__run-worker <runId>")
        .action(async (runId, _options, command) => {
        const config = await loadConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        await orchestrator.runWorker(runId);
    });
    await program.parseAsync(argv);
}
//# sourceMappingURL=cli.js.map