import { Command } from "commander";
import { loadConfig } from "./config.js";
import { OrchestratorService } from "./services/orchestrator.js";
import { ProjectInitializer } from "./services/project-initializer.js";
function collectFeature(value, previous) {
    previous.push(value);
    return previous;
}
function formatRun(run) {
    return [
        `${run.id} [${run.status}]`,
        `  phase: ${run.phase}`,
        `  base: ${run.baseBranch}`,
        `  branch: ${run.featureBranch}`,
        `  prd: ${run.prd?.filePath ?? "pending"}`,
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
    const projectInitializer = new ProjectInitializer();
    const loadInitializedConfig = async (configPath) => {
        await projectInitializer.assertInitialized();
        return loadConfig(configPath);
    };
    program
        .name("os-agents")
        .description("PRD-first Hans orchestrator for OpenSpec delivery.")
        .option("-c, --config <path>", "Path to a JSON config file.");
    program
        .command("init")
        .description("Prepare the current project folder to run OS Agents.")
        .action(async (_options, command) => {
        await projectInitializer.initialize(command.parent?.opts().config);
        console.log(`OS Agents initialized in ${process.cwd()}.`);
    });
    program
        .command("spawn")
        .description("Draft a PRD and implement one or more features from the current project.")
        .option("-b, --branch <branch>", "Optional base branch override. Defaults to the current branch.")
        .requiredOption("-f, --feature <feature>", "Feature request for Hans.", collectFeature, [])
        .option("--json", "Emit machine-readable JSON.")
        .action(async (options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config, {
            liveOutput: !options.json,
        });
        const result = await orchestrator.spawnRuns({
            baseBranch: options.branch,
            features: options.feature,
        });
        output(options.json ? result.runs : result.runs.map((run) => formatRun(run)), Boolean(options.json));
    });
    program
        .command("list")
        .description("List all known runs.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const runs = await orchestrator.listRuns();
        output(options.json ? runs : runs.map((run) => formatRun(run)), Boolean(options.json));
    });
    program
        .command("status [runId]")
        .description("Show one run or all runs.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
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
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const lines = await orchestrator.getLogs(runId, Number(options.tail));
        output(options.json ? lines : lines, Boolean(options.json));
    });
    program
        .command("cancel <runId>")
        .description("Cancel a run.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        const run = await orchestrator.cancelRun(runId);
        output(options.json ? run : formatRun(run), Boolean(options.json));
    });
    program
        .command("resume <runId>")
        .description("Resume a run after an interruption.")
        .option("--json", "Emit machine-readable JSON.")
        .action(async (runId, options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config, {
            liveOutput: !options.json,
        });
        const run = await orchestrator.resumeRun(runId);
        output(options.json ? run : formatRun(run), Boolean(options.json));
    });
    program
        .command("cleanup <runId>")
        .description("Apply workspace retention rules to a run immediately.")
        .action(async (runId, _options, command) => {
        const config = await loadInitializedConfig(command.parent?.opts().config);
        const orchestrator = new OrchestratorService(config);
        await orchestrator.cleanupRun(runId);
        console.log(`Cleanup applied for ${runId}.`);
    });
    await program.parseAsync(argv);
}
//# sourceMappingURL=cli.js.map