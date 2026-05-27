## ADDED Requirements

### Requirement: Detached workers can execute OpenSpec workflow commands
The system SHALL support OpenSpec workflow execution inside detached worker processes on headless hosts.

#### Scenario: Running on a remote Linux server
- **WHEN** a detached worker executes the default workflow on a remote host
- **THEN** the worker can invoke OpenSpec CLI commands without requiring an interactive desktop environment

### Requirement: Resume flows preserve OpenSpec workflow context
The system SHALL preserve enough OpenSpec workflow context to resume or inspect remote runs after disconnects or restarts.

#### Scenario: Reconnecting after worker interruption
- **WHEN** a worker stops during an OpenSpec-backed run and the operator later resumes it
- **THEN** the system restores the stored workflow metadata needed to continue or report on that run
