## ADDED Requirements

### Requirement: CLI can manage multiple concurrent agent runs
The system SHALL let an operator create and supervise multiple feature-oriented agent runs for the same repository from a single CLI session.

#### Scenario: Spawning multiple agents
- **WHEN** the operator starts two or more agent runs against one repository with different feature requests
- **THEN** the system creates distinct run identifiers for each agent
- **THEN** the system tracks their lifecycle independently
- **THEN** the system keeps each run visible through list and status commands

### Requirement: CLI exposes run lifecycle controls
The system SHALL provide CLI commands to inspect, cancel, and resume individual agent runs without affecting unrelated runs.

#### Scenario: Inspecting one run
- **WHEN** the operator requests the status of a specific run
- **THEN** the system returns the run identifier, current workflow phase, workspace path, branch information, and latest GitHub/Copilot metadata for that run only

#### Scenario: Cancelling one run
- **WHEN** the operator cancels a specific run
- **THEN** the system marks only that run as cancelled
- **THEN** the system leaves all other active runs unchanged

### Requirement: Run status is scriptable
The system SHALL support machine-readable output for orchestration commands so remote automation can consume run state.

#### Scenario: Requesting JSON output
- **WHEN** the operator invokes a status-oriented command with JSON output enabled
- **THEN** the system returns structured data for the requested run or runs
- **THEN** the output includes stable identifiers and workflow state values that automation can parse
