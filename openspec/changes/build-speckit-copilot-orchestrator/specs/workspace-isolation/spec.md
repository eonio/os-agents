## ADDED Requirements

### Requirement: Each agent run receives an isolated repository workspace
The system SHALL create a dedicated local repository clone or working copy for every agent run from a user-selected starting branch.

#### Scenario: Preparing a workspace from a branch
- **WHEN** the operator starts an agent run and provides a repository plus starting branch
- **THEN** the system creates a unique local workspace for that run
- **THEN** the workspace is initialized from the requested branch
- **THEN** the workspace path is recorded in the run state

### Requirement: Agent workspaces do not share mutable git state
The system SHALL prevent one agent run from mutating another run's repository state.

#### Scenario: Parallel runs target the same repository
- **WHEN** two active runs target the same upstream repository at the same time
- **THEN** each run operates in a different local workspace
- **THEN** git operations executed for one run do not change the other run's checked-out branch, index, or uncommitted files

### Requirement: Workspace cleanup is controllable
The system SHALL provide configurable retention for completed, failed, or cancelled workspaces.

#### Scenario: Retaining a failed workspace
- **WHEN** a run fails and workspace retention is enabled for failed runs
- **THEN** the system preserves the workspace for inspection
- **THEN** the run record indicates that the workspace is retained
