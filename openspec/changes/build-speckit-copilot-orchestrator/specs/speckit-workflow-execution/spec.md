## ADDED Requirements

### Requirement: Every run follows the Speckit workflow in order
The system SHALL enforce the configured Speckit workflow stages for each agent run before implementation is marked complete.

#### Scenario: Advancing through required stages
- **WHEN** an agent run progresses from intake toward implementation
- **THEN** the system records each completed Speckit stage in order
- **THEN** the system does not allow the run to skip required earlier stages

### Requirement: Workflow phase transitions are persisted
The system SHALL persist each run's current workflow phase and transition history so execution can recover after interruption.

#### Scenario: Recovering workflow state
- **WHEN** the orchestrator restarts after a run has already entered a later Speckit phase
- **THEN** the system restores the saved phase and transition history for that run
- **THEN** the run can resume from the last recorded valid phase

### Requirement: Stage failures are explicit
The system SHALL surface workflow-stage failures with enough detail for the operator to diagnose or retry the run.

#### Scenario: A stage fails
- **WHEN** a Speckit stage cannot complete successfully
- **THEN** the system marks the run as failed or retryable at that stage
- **THEN** the operator can see the failed phase and the associated error detail from the CLI
