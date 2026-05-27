# Copilot Instructions

## Build and test commands

- Install dependencies: `npm install`
- Build the CLI: `npm run build`
- Run the full test suite: `npm test`
- Run one test file: `npx vitest run test/workflow.test.ts`
- Run one named test: `npx vitest run test/workflow.test.ts -t "allows ordered transitions"`

## High-level architecture

- `src/index.ts` and `src/cli.ts` are a thin Commander-based entrypoint. Each CLI command loads config and delegates to `OrchestratorService`.
- `src/services/orchestrator.ts` is the system hub. `spawnRuns()` creates one orchestrator run per requested feature, persists a `RunRecord`, and launches a detached worker process. Hans workers prepare a workspace, run workflow preparation, spawn one worker per developer persona, wait for those runs to finish, score and merge their results with `TeamDeliberationService`, prepare a dedicated `-final` workspace for Hans, run the final Copilot implementation, then execute workflow handoff and GitHub handoff publishing.
- Developer workers use the same persisted run model but stop after their own workflow preparation, Copilot implementation, and handoff.
- Runtime state is disk-backed under `stateRoot` from `src/config.ts`: JSON run records in `runs/`, line-based logs in `logs/`, handoff JSON in `handoffs/`, cloned workspaces in `workspaces/`, and Copilot SDK state in `copilot-home/`.
- `src/state/run-store.ts` is the source of truth for persisted runs and workflow phase transitions. `src/domain/workflow.ts` defines the legal phase ordering.
- Workflow behavior is pluggable through `src/workflows/`. `createWorkflowProvider()` selects `openspec` or `speckit`; providers execute configured shell commands and write workflow metadata back onto `run.workflow`. The OpenSpec provider is the richer path and expects JSON-bearing command output from status/apply/handoff steps.
- `src/providers/copilot-provider.ts` is the Copilot SDK boundary. It builds persona-specific prompts for developers, a synthesis prompt for Hans, streams session events into the run log, and resumes sessions when a stored session ID exists.
- `src/providers/github-provider.ts` resolves repository inputs into clone URLs, writes handoff artifacts, and publishes a `repository_dispatch` event when the run targets GitHub and `GITHUB_TOKEN` is configured.

## Key conventions

- This is ESM TypeScript with `"type": "module"`. Keep local imports in `.ts` files using `.js` specifiers (for example `import { runCli } from "./cli.js"`), because the emitted runtime code is ESM.
- Treat `RunRecord` in `src/domain/types.ts` as the shared contract across CLI output, persistence, workflow providers, GitHub handoff artifacts, and Copilot sessions. If you add fields, also update `RunStore.normalizeRun()` so previously persisted runs still load.
- Preserve the ordered workflow phase model. Move runs through `RunStore.transitionPhase()` and the phase names in `src/domain/workflow.ts` instead of mutating phases ad hoc or introducing new intermediary names without updating the transition rules.
- Reuse `slugify()`, `makeRunId()`, and `renderTemplate()` from `src/utils/text.ts` for feature slugs, run IDs, feature branches, and workflow command templating. Feature branches are expected to stay in the `copilot/<feature-slug>-...` form.
- Keep shell and git execution centralized in `src/utils/process.ts`, `WorkspaceManager`, and workflow providers rather than open-coding `child_process.spawn` in new modules.
- Tests use Vitest and prefer temporary real filesystem/git state through `test/helpers.ts:createTestConfig()` instead of heavy mocking. Follow the existing `test/*.test.ts` style when covering workspace, workflow, or persistence changes.
- Config loading is intentionally layered: explicit `--config` path first, then `os-agents.config.yaml|yml|json` in the current working directory, then environment/default values from `src/config.ts`.
