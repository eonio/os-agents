## Why

The orchestrator currently assumes a Speckit-first lifecycle, which conflicts with the goal of standardizing on OpenSpec as the repository's primary spec-driven framework. Making OpenSpec the default now keeps the runtime aligned with the project's own change-management workflow and removes an unnecessary split between planning artifacts and agent execution.

## What Changes

- **BREAKING** Replace Speckit as the orchestrator's default workflow engine with OpenSpec.
- Refactor workflow execution so the orchestrator uses a generic workflow adapter instead of a hard-coded Speckit provider.
- Add an OpenSpec workflow provider that creates or continues changes, checks artifact/apply status, and runs implementation through the OpenSpec flow.
- Rename configuration and documentation so OpenSpec is the default spec-driven framework surfaced by the CLI and runtime.
- Preserve per-agent workspace isolation, Copilot SDK integration, GitHub handoff publishing, and headless SSH operation while changing the default workflow backend.

## Capabilities

### New Capabilities
- `openspec-workflow-execution`: Drive each agent through an OpenSpec-first change workflow before and during implementation.
- `workflow-provider-selection`: Select and configure the workflow engine used by the orchestrator, with OpenSpec as the default.
- `workflow-handoff-metadata`: Include workflow-engine and OpenSpec change details in persisted run state and GitHub handoff outputs.
- `remote-workflow-operations`: Support OpenSpec CLI execution and recovery inside detached remote worker runs.

### Modified Capabilities
- None.

## Impact

- Replaces the current Speckit-specific provider and command configuration with a workflow abstraction plus an OpenSpec provider implementation.
- Changes persisted run metadata, runtime prompts, and documentation to reflect OpenSpec change names, stages, and handoff semantics.
- Affects CLI configuration, workflow-stage execution, tests, and operator documentation for Linux/SSH deployments.
