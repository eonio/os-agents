## 1. Project scaffolding

- [x] 1.1 Create the CLI application structure, dependency manifest, and runtime module boundaries for commands, services, providers, and persistence.
- [x] 1.2 Add configuration loading for repository defaults, workspace root, retention policy, GitHub credentials, and headless JSON output settings.
- [x] 1.3 Define shared domain models for agent runs, workflow phases, workspace metadata, provider session identifiers, and handoff artifacts.

## 2. Workspace and persistence foundations

- [x] 2.1 Implement the local state store for creating, updating, listing, and recovering run records across process restarts.
- [x] 2.2 Implement repository resolution plus per-run workspace preparation from a user-selected repository and base branch.
- [x] 2.3 Add workspace retention and cleanup policies for completed, failed, and cancelled runs.

## 3. Agent orchestration runtime

- [x] 3.1 Implement the orchestration service that spawns, supervises, cancels, and resumes multiple concurrent runs with unique run identifiers.
- [x] 3.2 Add structured status, list, inspect, and log commands for individual runs and fleet-wide views.
- [x] 3.3 Implement per-run execution logging and error propagation so failed stages remain diagnosable from the CLI.

## 4. Speckit workflow and provider integration

- [x] 4.1 Implement the Speckit workflow state machine and persist ordered stage transitions for each run.
- [x] 4.2 Add the Copilot SDK adapter that creates agent sessions with repository-aware context and stores reconnectable provider identifiers.
- [x] 4.3 Add the GitHub integration adapter that publishes run summaries, branch metadata, and handoff artifacts for downstream GitHub Actions workflows.

## 5. Operational hardening

- [x] 5.1 Add resume and recovery flows for active runs after orchestrator restarts or SSH disconnects.
- [x] 5.2 Add automated tests for parallel orchestration, workspace isolation, workflow ordering, persistence recovery, and JSON output contracts.
- [x] 5.3 Document headless Linux usage, SSH operating patterns, and CI/CD handoff expectations for repository operators.
