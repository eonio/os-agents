import { mkdir, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
const configSchema = z
    .object({
    stateRoot: z.string().optional(),
    workspaceRoot: z.string().optional(),
    retention: z
        .object({
        completed: z.boolean().optional(),
        failed: z.boolean().optional(),
        cancelled: z.boolean().optional(),
    })
        .optional(),
    workflow: z
        .object({
        defaultProvider: z.enum(["openspec", "speckit"]).optional(),
        openspec: z
            .object({
            changePrefix: z.string().optional(),
            createChangeCommand: z.string().optional(),
            statusCommand: z.string().optional(),
            applyCommand: z.string().optional(),
            handoffCommand: z.string().optional(),
        })
            .optional(),
        speckit: z
            .object({
            draftCommand: z.string().optional(),
            handoffCommand: z.string().optional(),
        })
            .optional(),
    })
        .optional(),
    github: z
        .object({
        token: z.string().optional(),
        apiBaseUrl: z.string().optional(),
        dispatchEventType: z.string().optional(),
        preferSsh: z.boolean().optional(),
    })
        .optional(),
    copilot: z
        .object({
        model: z.string().optional(),
        logLevel: z.enum(["none", "error", "warning", "info", "debug", "all"]).optional(),
        baseDirectory: z.string().optional(),
        remoteSessionMode: z.enum(["off", "export", "on"]).optional(),
    })
        .optional(),
})
    .partial();
async function fileExists(filePath) {
    try {
        await stat(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function loadConfigFile(configPath) {
    if (configPath && (await fileExists(configPath))) {
        return parseConfigDocument(configPath, await readFile(configPath, "utf8"));
    }
    const candidates = [
        path.join(process.cwd(), "os-agents.config.yaml"),
        path.join(process.cwd(), "os-agents.config.yml"),
        path.join(process.cwd(), "os-agents.config.json"),
    ];
    for (const candidate of candidates) {
        if (await fileExists(candidate)) {
            return parseConfigDocument(candidate, await readFile(candidate, "utf8"));
        }
    }
    return {};
}
function parseConfigDocument(configPath, document) {
    if (configPath.endsWith(".json")) {
        return JSON.parse(document);
    }
    return parseYaml(document);
}
export async function loadConfig(configPath) {
    const fileConfig = configSchema.parse(await loadConfigFile(configPath));
    const stateRoot = fileConfig.stateRoot ??
        process.env.OS_AGENTS_HOME ??
        path.join(os.homedir(), ".os-agents");
    const workspaceRoot = fileConfig.workspaceRoot ?? path.join(stateRoot, "workspaces");
    const config = {
        stateRoot,
        workspaceRoot,
        runsRoot: path.join(stateRoot, "runs"),
        logsRoot: path.join(stateRoot, "logs"),
        handoffsRoot: path.join(stateRoot, "handoffs"),
        retention: {
            completed: fileConfig.retention?.completed ?? false,
            failed: fileConfig.retention?.failed ?? true,
            cancelled: fileConfig.retention?.cancelled ?? true,
        },
        workflow: {
            defaultProvider: fileConfig.workflow?.defaultProvider ?? "openspec",
            openspec: {
                changePrefix: fileConfig.workflow?.openspec?.changePrefix ?? "agent",
                createChangeCommand: fileConfig.workflow?.openspec?.createChangeCommand ??
                    'openspec new change "{changeName}"',
                statusCommand: fileConfig.workflow?.openspec?.statusCommand ??
                    'openspec status --change "{changeName}" --json',
                applyCommand: fileConfig.workflow?.openspec?.applyCommand ??
                    'openspec instructions apply --change "{changeName}" --json',
                handoffCommand: fileConfig.workflow?.openspec?.handoffCommand ??
                    'openspec status --change "{changeName}" --json',
            },
            speckit: {
                draftCommand: fileConfig.workflow?.speckit?.draftCommand ??
                    'speckit draft --feature "{feature}" --run-id {runId}',
                handoffCommand: fileConfig.workflow?.speckit?.handoffCommand ??
                    'speckit handoff --run-id {runId} --branch {featureBranch}',
            },
        },
        github: {
            token: fileConfig.github?.token ?? process.env.GITHUB_TOKEN,
            apiBaseUrl: fileConfig.github?.apiBaseUrl ?? "https://api.github.com",
            dispatchEventType: fileConfig.github?.dispatchEventType ?? "speckit_orchestrator_handoff",
            preferSsh: fileConfig.github?.preferSsh ?? true,
        },
        copilot: {
            model: fileConfig.copilot?.model ?? process.env.COPILOT_MODEL ?? "gpt-5.4",
            logLevel: fileConfig.copilot?.logLevel ?? "info",
            baseDirectory: fileConfig.copilot?.baseDirectory ?? path.join(stateRoot, "copilot-home"),
            remoteSessionMode: fileConfig.copilot?.remoteSessionMode ?? "export",
        },
    };
    await Promise.all([
        mkdir(config.stateRoot, { recursive: true }),
        mkdir(config.workspaceRoot, { recursive: true }),
        mkdir(config.runsRoot, { recursive: true }),
        mkdir(config.logsRoot, { recursive: true }),
        mkdir(config.handoffsRoot, { recursive: true }),
        mkdir(config.copilot.baseDirectory, { recursive: true }),
    ]);
    return config;
}
//# sourceMappingURL=config.js.map