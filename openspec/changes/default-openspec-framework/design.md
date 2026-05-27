## Context

The current orchestrator hard-codes Speckit into both configuration and runtime execution. `loadConfig` exposes only Speckit commands, `SpeckitProvider` runs those commands directly, and `OrchestratorService` labels the workflow stages and logs in Speckit terms. The requested change is to make OpenSpec the default spec-driven framework while preserving the rest of the runtime model: per-agent workspace isolation, detached SSH-friendly workers, Copilot SDK execution, persisted state, and GitHub handoff publishing.

Because the workflow engine is currently embedded into the run loop, this is a cross-cutting refactor rather than a simple command rename. The implementation needs to separate workflow orchestration from agent implementation, surface the selected workflow in config and persisted metadata, and make OpenSpec the default without preventing future alternate providers.

## Goals / Non-Goals

**Goals:**

- Replace the Speckit-specific provider with a workflow abstraction that the orchestrator can call generically.
- Make OpenSpec the default configured workflow engine for new installations and docs.
- Add an OpenSpec provider that can initialize or continue a change, prepare implementation context, and record change metadata for run state and handoff output.
- Preserve current multi-agent orchestration, workspace isolation, Copilot SDK usage, and detached worker semantics.
- Keep room for optional non-default workflow providers later instead of baking OpenSpec in a second time.

**Non-Goals:**

- Supporting every possible OpenSpec schema beyond the spec-driven flow needed by this project.
- Removing all configurability for alternate workflow engines in the future.
- Replacing GitHub Actions or changing the CI/CD handoff contract beyond adding workflow metadata.

## Decisions

### Decision: Introduce a generic workflow provider interface

The orchestrator should depend on a workflow adapter with methods for the pre-implementation phase, post-implementation phase, and run metadata enrichment. `OrchestratorService` should call the interface rather than a concrete Speckit provider.

**Why:** This is the smallest change that removes hard-coded Speckit while preventing a new hard-coded OpenSpec dependency in the runtime loop.

**Alternatives considered:**

- **Rename Speckit commands to OpenSpec commands in place:** quick but leaves the architecture coupled to one workflow.
- **Implement full plugin discovery:** flexible, but larger than needed for this migration.

### Decision: Default config to OpenSpec while retaining explicit workflow selection

Configuration should gain a workflow section with a `defaultProvider` and provider-specific settings. OpenSpec becomes the default provider and Speckit-specific top-level config is removed from the default path.

**Why:** Operators need a clear default, but the codebase benefits from keeping provider choice explicit in config and persisted runs.

**Alternatives considered:**

- **Always force OpenSpec with no provider selection:** simpler today, but makes future workflow support harder.
- **Keep Speckit config names and reinterpret them:** confusing for operators and docs.

### Decision: Record OpenSpec change identifiers in run metadata and GitHub handoff payloads

The run record should store workflow provider identity plus OpenSpec change name and artifact/apply progress where available. Handoff JSON and GitHub repository-dispatch payloads should include the same workflow metadata.

**Why:** Operators and downstream automation need to know which OpenSpec change a run created or continued, especially across resume flows and CI/CD handoff.

**Alternatives considered:**

- **Log OpenSpec output only:** insufficient for machine-readable status and automation.
- **Recompute metadata on demand from logs:** brittle and unnecessary.

### Decision: Map OpenSpec execution onto the existing high-level phases

The persisted phase model should stay at the current orchestration granularity (`drafting-spec`, `implementing`, `handoff`) while OpenSpec-specific detail is stored as workflow metadata and logs.

**Why:** This keeps state migration simpler and avoids broad CLI/status changes while still surfacing OpenSpec detail where it matters.

**Alternatives considered:**

- **Replace top-level phases with every OpenSpec artifact step:** richer, but increases scope across status output, tests, and resume behavior.

## Risks / Trade-offs

- **[OpenSpec command behavior is more stateful than Speckit commands]** -> Mitigate by persisting change names and status snapshots after each workflow step.
- **[Refactoring the provider boundary can break the worker loop]** -> Mitigate with targeted tests for workflow-provider invocation and run-state transitions.
- **[Operators may still have old Speckit-based config files]** -> Mitigate with clear docs and compatibility handling or explicit validation errors.
- **[OpenSpec may require additional repository artifacts before apply]** -> Mitigate by keeping the provider responsible for reading change status and surfacing blocked states clearly.

## Migration Plan

1. Introduce workflow-provider domain types and replace direct `SpeckitProvider` usage in the orchestrator.
2. Add OpenSpec configuration defaults and provider implementation.
3. Extend run state and handoff metadata with workflow-provider and OpenSpec change fields.
4. Update prompts, logs, tests, and docs to describe OpenSpec as the default framework.
5. Remove Speckit-first naming from default configs and operator guidance.

Rollback is straightforward during development: restore the prior Speckit provider wiring and config defaults if the OpenSpec provider proves unstable.

## Open Questions

- Should the first OpenSpec implementation auto-generate change names from feature text, or allow an explicit override per run later?
- Do we want temporary backward compatibility for existing `speckit` config keys, or is a clean break acceptable now?
