import { OpenSpecWorkflowProvider } from "./openspec-provider.js";
import { SpeckitWorkflowProvider } from "./speckit-provider.js";
export function createWorkflowProvider(config, run) {
    const providerId = run?.workflow.provider ?? config.workflow.defaultProvider;
    switch (providerId) {
        case "speckit":
            return new SpeckitWorkflowProvider(config);
        case "openspec":
        default:
            return new OpenSpecWorkflowProvider(config);
    }
}
//# sourceMappingURL=index.js.map