## ADDED Requirements

### Requirement: Each developer persona has a stable profile
The system SHALL define stable profiles for David, Mark, Katy, Mary, and George that influence how each developer explores and contributes.

#### Scenario: Building developer prompts
- **WHEN** the system prepares a developer execution prompt
- **THEN** the prompt includes the assigned developer's name and profile guidance

### Requirement: Developer personas remain fullstack contributors
The system SHALL treat every developer persona as a fullstack contributor even when the persona emphasizes a specific specialty.

#### Scenario: Assigning feature work
- **WHEN** a developer receives a feature request
- **THEN** the system instructs the developer to explore the feature as a fullstack contributor
- **THEN** the prompt also includes that developer's specialty bias and value contribution
