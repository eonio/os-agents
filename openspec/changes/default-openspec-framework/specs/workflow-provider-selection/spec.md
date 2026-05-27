## ADDED Requirements

### Requirement: The orchestrator supports explicit workflow-provider selection
The system SHALL expose the workflow provider as configuration rather than hard-coding workflow logic in the runtime loop.

#### Scenario: Loading default configuration
- **WHEN** the operator uses the orchestrator without custom workflow configuration
- **THEN** the system loads OpenSpec as the default workflow provider

### Requirement: Run records capture which workflow provider is active
The system SHALL persist the selected workflow provider for each run.

#### Scenario: Resuming a stored run
- **WHEN** the system resumes an existing run from persisted state
- **THEN** the system uses the workflow provider stored on that run rather than assuming a global default
