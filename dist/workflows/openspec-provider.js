import { stat } from "node:fs/promises";
import path from "node:path";
import { execShell } from "../utils/process.js";
import { renderTemplate } from "../utils/text.js";
async function pathExists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export class OpenSpecWorkflowProvider {
    config;
    id = "openspec";
    constructor(config) {
        this.config = config;
    }
    async prepareRun(run) {
        const changeName = run.workflow.changeName ?? this.buildChangeName(run);
        const changeDirectory = path.join(run.workspacePath, "openspec", "changes", changeName);
        const outputs = [];
        if (!(await pathExists(changeDirectory))) {
            outputs.push(await this.executeCommand(this.config.workflow.openspec.createChangeCommand, run, changeName));
        }
        const statusOutput = await this.executeCommand(this.config.workflow.openspec.statusCommand, run, changeName);
        const status = this.parseJson(statusOutput);
        const applyOutput = await this.executeCommand(this.config.workflow.openspec.applyCommand, run, changeName);
        const apply = this.parseJson(applyOutput);
        outputs.push(statusOutput, applyOutput);
        return {
            logOutput: outputs.filter(Boolean).join("\n"),
            workflow: {
                provider: this.id,
                changeName,
                changeDirectory: apply.changeDir ?? changeDirectory,
                applyState: apply.state ?? (status.isComplete ? "all_done" : "ready"),
                progress: apply.progress,
                lastStatusSummary: apply.instruction ?? this.describeStatus(status, apply),
            },
        };
    }
    async finalizeRun(run) {
        const changeName = run.workflow.changeName ?? this.buildChangeName(run);
        const output = await this.executeCommand(this.config.workflow.openspec.handoffCommand, run, changeName);
        const status = this.tryParseJson(output);
        return {
            logOutput: output,
            workflow: {
                provider: this.id,
                changeName,
                changeDirectory: run.workflow.changeDirectory ?? path.join(run.workspacePath, "openspec", "changes", changeName),
                applyState: status?.isComplete ? "all_done" : run.workflow.applyState,
                progress: run.workflow.progress,
                lastStatusSummary: status
                    ? this.describeStatus(status, undefined)
                    : "OpenSpec post-implementation step executed.",
            },
        };
    }
    buildPromptContext(run) {
        const changeName = run.workflow.changeName ?? this.buildChangeName(run);
        return [
            "Current workflow provider: OpenSpec.",
            `OpenSpec change: ${changeName}.`,
            run.workflow.changeDirectory
                ? `OpenSpec change directory: ${run.workflow.changeDirectory}.`
                : "OpenSpec change directory will live under openspec/changes/<change-name>.",
            "Before making code changes, inspect the OpenSpec change state and follow the required artifact/apply workflow.",
            `Use commands such as \`openspec status --change "${changeName}" --json\` and \`openspec instructions apply --change "${changeName}" --json\` to understand what remains.`,
            "If proposal, design, specs, or tasks are incomplete, update them before finalizing implementation.",
        ];
    }
    buildChangeName(run) {
        return `${this.config.workflow.openspec.changePrefix}-${run.featureSlug}-${run.id.slice(-8)}`;
    }
    async executeCommand(template, run, changeName) {
        const command = renderTemplate(template, {
            runId: run.id,
            feature: run.feature,
            featureBranch: run.featureBranch,
            baseBranch: run.baseBranch,
            repository: run.repository.input,
            workspacePath: run.workspacePath,
            changeName,
        });
        const result = await execShell(command, { cwd: run.workspacePath });
        return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
    }
    parseJson(output) {
        const jsonBlock = this.extractLastJsonBlock(output);
        return JSON.parse(jsonBlock);
    }
    tryParseJson(output) {
        try {
            return this.parseJson(output);
        }
        catch {
            return undefined;
        }
    }
    extractLastJsonBlock(output) {
        const start = output.indexOf("{");
        const end = output.lastIndexOf("}");
        if (start < 0 || end < start) {
            throw new Error(`Expected JSON output from OpenSpec command, received: ${output}`);
        }
        return output.slice(start, end + 1);
    }
    describeStatus(status, apply) {
        if (apply?.state) {
            const progress = apply.progress
                ? `${apply.progress.complete}/${apply.progress.total} tasks complete`
                : "progress unavailable";
            return `OpenSpec apply state: ${apply.state} (${progress}).`;
        }
        if (status?.artifacts) {
            const done = status.artifacts.filter((artifact) => artifact.status === "done").length;
            return `OpenSpec artifacts complete: ${done}/${status.artifacts.length}.`;
        }
        return "OpenSpec workflow prepared.";
    }
}
//# sourceMappingURL=openspec-provider.js.map