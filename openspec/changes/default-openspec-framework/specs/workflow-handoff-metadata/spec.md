## ADDED Requirements

### Requirement: Handoff artifacts include workflow metadata
The system SHALL include workflow-provider metadata and OpenSpec change details in persisted handoff artifacts.

#### Scenario: Writing a handoff artifact
- **WHEN** a run writes its handoff artifact
- **THEN** the artifact includes the workflow provider identity
- **THEN** the artifact includes any OpenSpec change identifier known for the run

### Requirement: GitHub dispatch payloads preserve workflow context
The system SHALL publish workflow-provider metadata in GitHub handoff payloads when dispatch publishing is enabled.

#### Scenario: Publishing to GitHub
- **WHEN** a run publishes a repository-dispatch event
- **THEN** the payload includes the workflow provider and OpenSpec change metadata alongside the existing branch and run fields
