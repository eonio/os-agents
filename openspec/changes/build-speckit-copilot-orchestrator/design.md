## Context

The project starts from an empty workspace and needs a CLI-first architecture that can run entirely on a headless Linux server. The orchestrator must accept a repository and base branch from the user, spawn multiple concurrent code agents, allocate an isolated local clone or working copy per agent, connect those agents to GitHub through the Copilot SDK, and enforce a Speckit workflow before implementation work is marked complete.

The primary constraints are:

- No GUI assumptions: the operator will connect over SSH and drive the system from a terminal.
- Parallel feature delivery: one repository may have several active feature agents at once.
- Workspace safety: agents must never share mutable git state.
- GitHub-native lifecycle: repository metadata, branches, CI/CD status, and resulting pull-request-oriented workflows must stay visible through GitHub.
- Durable execution: if the orchestrator process or host restarts, in-flight work must be recoverable from local state.

## Goals / Non-Goals

**Goals:**

- Provide a CLI command set for creating, starting, listing, inspecting, cancelling, and resuming agent runs.
- Persist per-run metadata, workspace locations, branch settings, workflow stage, and GitHub/Copilot session identifiers.
- Standardize each agent run around a fixed lifecycle: request intake, workspace preparation, Speckit artifact generation, implementation, and GitHub handoff.
- Separate orchestration concerns from provider-specific integrations so GitHub Actions and cloud deployment hooks can evolve independently.
- Make agent output consumable both by humans in a terminal and by scripts through structured JSON output.

**Non-Goals:**

- Replacing GitHub Actions, deployment pipelines, or cloud provisioning systems.
- Providing a graphical interface in the initial release.
- Allowing multiple agents to commit into the same working directory.
- Designing provider-specific deployment automation beyond the handoff contracts needed by CI/CD.

## Decisions

### Decision: Build the orchestrator as a modular CLI with an internal runtime service layer

The CLI should remain a thin command surface over reusable orchestration services. Commands such as `run`, `spawn`, `status`, and `resume` call into a runtime that manages state, workspaces, provider sessions, and workflow transitions.

**Why:** This keeps headless operation simple while avoiding business logic embedded directly in argument handlers. It also makes future automation entry points, such as a daemon mode or webhook-triggered execution, reuse the same orchestration core.

**Alternatives considered:**

- **Single monolithic command implementation:** simpler at first, but hard to test and extend.
- **Always-on server with remote CLI client:** useful later, but unnecessary for an initial SSH-first operating model.

### Decision: Use one isolated local repository workspace per agent run

Each spawned agent receives a dedicated directory derived from the user-selected repository and base branch. The workspace may be a fresh clone or a local copy optimized from a cached mirror, but the resulting `.git` state is private to that run.

**Why:** This eliminates cross-agent branch contamination, index locking, and accidental uncommitted file overlap while still allowing all runs to target the same upstream repository.

**Alternatives considered:**

- **Shared clone with multiple branches:** lower disk usage, but unsafe under parallel agent mutation.
- **Worktrees from one shared repository:** workable for some cases, but still couples shared object storage and operational failure modes too tightly for the initial reliability target.

### Decision: Model the Speckit workflow as an explicit state machine

The orchestrator should store each run's current phase and only permit legal transitions: `queued -> preparing-workspace -> drafting-spec -> awaiting-approval? -> implementing -> handoff -> completed|failed|cancelled`. Each transition records timestamps, artifacts, and error details.

**Why:** A durable state machine makes restart recovery, progress reporting, and auditability straightforward. It also ensures every agent follows the required workflow rather than skipping directly to implementation.

**Alternatives considered:**

- **Prompt-only workflow guidance:** too easy for agents to drift from the required process.
- **Ad hoc status flags:** insufficiently strict for recovery and validation.

### Decision: Abstract GitHub/Copilot integration behind provider adapters

The runtime should depend on interfaces for repository access, Copilot agent session creation, GitHub status updates, and artifact publication. The first concrete adapter targets GitHub plus the Copilot SDK.

**Why:** This keeps the orchestrator testable and local-runtime-friendly while still allowing deeper GitHub integration later without rewriting orchestration logic.

**Alternatives considered:**

- **Direct SDK calls throughout the codebase:** faster to start, but couples business logic to one vendor surface.
- **Generic plugin framework from day one:** more flexible, but premature for the first release.

### Decision: Persist runtime state locally in a structured store and mirror key state to GitHub

The orchestrator should keep authoritative local state for active runs, workspace mappings, workflow phase, and recovery metadata. GitHub should receive summaries, branch metadata, logs, and artifact references needed for collaboration and CI/CD.

**Why:** Local persistence is required for offline recovery and low-latency control over active runs; GitHub visibility is required for collaboration and downstream automation.

**Alternatives considered:**

- **GitHub-only state:** insufficient for low-level workspace recovery.
- **Local-only state:** hides progress from collaborators and automation.

## Risks / Trade-offs

- **[High disk consumption from per-agent clones]** -> Mitigate with configurable workspace retention policies and optional local mirror/copy optimization.
- **[Copilot SDK or GitHub API failures leave runs in limbo]** -> Mitigate with explicit retryable states, surfaced failure reasons, and resume commands.
- **[Long-running SSH sessions disconnect during execution]** -> Mitigate by persisting run state and supporting detached, resumable commands.
- **[Speckit workflow steps vary by repository maturity]** -> Mitigate by keeping workflow stages configurable but enforcing the required stage order.
- **[Parallel runs create noisy status output]** -> Mitigate with per-run logs plus filtered `status --json` views.

## Migration Plan

1. Scaffold the CLI, runtime modules, and persistent state store.
2. Implement repository resolution and isolated workspace preparation.
3. Add Copilot SDK and GitHub adapters behind interfaces with stubbed local implementations for tests.
4. Encode the Speckit state machine and artifact-tracking contracts.
5. Add multi-agent scheduling, status commands, and recovery/resume flows.
6. Wire GitHub handoff outputs needed for GitHub Actions and CI/CD consumption.

Rollback for early releases is operational rather than migratory: stop the orchestrator, archive or remove generated state directories, and disable any GitHub automation depending on its outputs.

## Open Questions

- Which Copilot SDK primitives are mandatory for agent creation, streaming progress, and tool execution in the initial release?
- Should the first implementation optimize workspace creation with cached mirrors immediately, or begin with simple full clones?
- How much of the Speckit workflow needs explicit user approval gates versus fully automated progression?
