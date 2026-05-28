import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AppConfig } from "./domain/types.js";

const configSchema = z
  .object({
    retention: z
      .object({
        completed: z.boolean().optional(),
        failed: z.boolean().optional(),
        cancelled: z.boolean().optional(),
      })
      .optional(),
    workflow: z
      .object({
        openspec: z
          .object({
            changePrefix: z.string().optional(),
            createChangeCommand: z.string().optional(),
            statusCommand: z.string().optional(),
            applyCommand: z.string().optional(),
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadConfigFile(configPath?: string): Promise<unknown> {
  if (configPath) {
    if (!configPath.endsWith(".json")) {
      throw new Error("OS Agents now supports JSON config files only.");
    }

    if (await fileExists(configPath)) {
      return JSON.parse(await readFile(configPath, "utf8"));
    }

    throw new Error(`Config file not found: ${configPath}`);
  }

  const candidate = path.join(process.cwd(), "os-agents.config.json");
  if (await fileExists(candidate)) {
    return JSON.parse(await readFile(candidate, "utf8"));
  }

  return {};
}

export async function loadConfig(configPath?: string): Promise<AppConfig> {
  const fileConfig = configSchema.parse(await loadConfigFile(configPath));
  const projectRoot = process.cwd();
  const stateRoot =
    process.env.OS_AGENTS_HOME ?? path.join(projectRoot, ".os-agents");
  const workspaceRoot = path.join(stateRoot, "workspaces");
  const runsRoot = path.join(stateRoot, "runs");
  const logsRoot = path.join(stateRoot, "logs");
  const handoffsRoot = path.join(stateRoot, "handoffs");
  const featuresRoot = path.join(projectRoot, "features");
  const baseDirectory =
    fileConfig.copilot?.baseDirectory ?? path.join(stateRoot, "copilot-home");

  const config: AppConfig = {
    projectRoot,
    stateRoot,
    workspaceRoot,
    runsRoot,
    logsRoot,
    handoffsRoot,
    featuresRoot,
    retention: {
      completed: fileConfig.retention?.completed ?? false,
      failed: fileConfig.retention?.failed ?? true,
      cancelled: fileConfig.retention?.cancelled ?? true,
    },
    workflow: {
      openspec: {
        changePrefix: fileConfig.workflow?.openspec?.changePrefix ?? "agent",
        createChangeCommand:
          fileConfig.workflow?.openspec?.createChangeCommand ??
          'openspec new change "{changeName}"',
        statusCommand:
          fileConfig.workflow?.openspec?.statusCommand ??
          'openspec status --change "{changeName}" --json',
        applyCommand:
          fileConfig.workflow?.openspec?.applyCommand ??
          'openspec instructions apply --change "{changeName}" --json',
        handoffCommand:
          fileConfig.workflow?.openspec?.handoffCommand ??
          'openspec status --change "{changeName}" --json',
      },
    },
    github: {
      token: fileConfig.github?.token ?? process.env.GITHUB_TOKEN,
      apiBaseUrl: fileConfig.github?.apiBaseUrl ?? "https://api.github.com",
      dispatchEventType:
        fileConfig.github?.dispatchEventType ?? "openspec_orchestrator_handoff",
      preferSsh: fileConfig.github?.preferSsh ?? true,
    },
    copilot: {
      model: fileConfig.copilot?.model ?? process.env.COPILOT_MODEL ?? "gpt-5.4",
      logLevel: fileConfig.copilot?.logLevel ?? "info",
      baseDirectory,
      remoteSessionMode: fileConfig.copilot?.remoteSessionMode ?? "export",
    },
  };

  await Promise.all([
    mkdir(config.stateRoot, { recursive: true }),
    mkdir(config.workspaceRoot, { recursive: true }),
    mkdir(config.runsRoot, { recursive: true }),
    mkdir(config.logsRoot, { recursive: true }),
    mkdir(config.handoffsRoot, { recursive: true }),
    mkdir(config.featuresRoot, { recursive: true }),
    mkdir(config.copilot.baseDirectory, { recursive: true }),
  ]);

  return config;
}
