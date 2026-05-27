## ADDED Requirements

### Requirement: Runs are created with GitHub-aware agent context
The system SHALL initialize every agent run with repository, branch, feature request, and run metadata needed by the Copilot SDK and GitHub integrations.

#### Scenario: Starting a run with repository metadata
- **WHEN** the operator starts an agent run
- **THEN** the system resolves the target GitHub repository and requested base branch
- **THEN** the system passes repository-aware context into the agent session it creates

### Requirement: The orchestrator tracks Copilot session identifiers
The system SHALL persist provider-specific identifiers needed to reconnect to, inspect, or resume agent sessions.

#### Scenario: Resuming after a process restart
- **WHEN** the orchestrator restarts while a run is still active
- **THEN** the system loads the saved provider session identifiers for that run
- **THEN** the system attempts to reconnect or surface the run as recoverable with explicit status

### Requirement: GitHub-visible status can be published
The system SHALL expose run summaries and resulting branch or artifact metadata in a form GitHub workflows can consume.

#### Scenario: Publishing run handoff data
- **WHEN** a run reaches handoff or completion
- **THEN** the system produces structured metadata describing the run outcome, relevant branch information, and generated artifacts
- **THEN** the metadata is available for GitHub-native automation to read
