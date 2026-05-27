import { renderTemplate } from "../utils/text.js";
import { execShell } from "../utils/process.js";
export class SpeckitWorkflowProvider {
    config;
    id = "speckit";
    constructor(config) {
        this.config = config;
    }
    async prepareRun(run) {
        const logOutput = await this.runConfiguredStage(this.config.workflow.speckit.draftCommand, run);
        return {
            logOutput,
            workflow: {
                provider: this.id,
                lastStatusSummary: "Speckit draft stage executed.",
            },
        };
    }
    async finalizeRun(run) {
        const logOutput = await this.runConfiguredStage(this.config.workflow.speckit.handoffCommand, run);
        return {
            logOutput,
            workflow: {
                provider: this.id,
                lastStatusSummary: "Speckit handoff stage executed.",
            },
        };
    }
    buildPromptContext(run) {
        return [
            "Current workflow provider: Speckit.",
            "Follow the Speckit workflow artifacts or commands already prepared in the repository before finalizing implementation.",
            `Assigned feature request: ${run.feature}`,
        ];
    }
    async runConfiguredStage(template, run) {
        const command = renderTemplate(template, {
            runId: run.id,
            feature: run.feature,
            featureBranch: run.featureBranch,
            baseBranch: run.baseBranch,
            repository: run.repository.input,
            workspacePath: run.workspacePath,
            changeName: run.workflow.changeName ?? "",
        });
        const result = await execShell(command, { cwd: run.workspacePath });
        return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
    }
}
//# sourceMappingURL=speckit-provider.js.map