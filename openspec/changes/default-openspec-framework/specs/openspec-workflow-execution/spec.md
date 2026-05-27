## ADDED Requirements

### Requirement: Agent runs execute an OpenSpec-first workflow before implementation
The system SHALL use OpenSpec as the default spec-driven workflow for agent runs before and during implementation.

#### Scenario: Starting a new run with default workflow settings
- **WHEN** an operator starts a run without overriding the workflow provider
- **THEN** the system uses the OpenSpec workflow provider for the run
- **THEN** the run enters implementation only after the OpenSpec provider has prepared the required change context

### Requirement: OpenSpec workflow state is visible during orchestration
The system SHALL persist OpenSpec workflow details needed to inspect or resume a run.

#### Scenario: Inspecting an OpenSpec-backed run
- **WHEN** an operator inspects a run that uses the default workflow provider
- **THEN** the system includes the OpenSpec workflow identity and change metadata in the run state it returns

### Requirement: OpenSpec post-implementation handoff is executed
The system SHALL run the configured OpenSpec completion or handoff step after Copilot implementation finishes.

#### Scenario: Completing a run
- **WHEN** an OpenSpec-backed run reaches the handoff phase
- **THEN** the system executes the configured OpenSpec post-implementation action
- **THEN** the resulting run metadata reflects that the OpenSpec handoff step was attempted
