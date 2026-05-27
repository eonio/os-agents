## ADDED Requirements

### Requirement: Every developer has an isolated OpenSpec workflow
The system SHALL assign each developer agent its own isolated workspace and OpenSpec workflow for the requested feature.

#### Scenario: Preparing developer workspaces
- **WHEN** Hans creates the five developer runs
- **THEN** each developer receives a different workspace
- **THEN** each workspace initializes its own OpenSpec change flow for the same feature request

### Requirement: Developer workflow metadata is preserved separately
The system SHALL preserve OpenSpec change metadata for each developer run independently.

#### Scenario: Inspecting developer workflow state
- **WHEN** an operator inspects a developer child run
- **THEN** the system returns the OpenSpec change metadata for that specific developer only
