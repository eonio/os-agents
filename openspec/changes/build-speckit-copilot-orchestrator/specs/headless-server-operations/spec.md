## ADDED Requirements

### Requirement: The orchestrator operates without an interactive desktop environment
The system SHALL support full operation from a terminal on a headless Linux host.

#### Scenario: Running over SSH
- **WHEN** the operator connects to a remote Linux server over SSH and invokes the CLI
- **THEN** the system can start, monitor, and control agent runs without requiring GUI access

### Requirement: Active runs survive client disconnects
The system SHALL preserve active run state across SSH disconnects and later CLI reconnections.

#### Scenario: SSH session drops during execution
- **WHEN** the operator disconnects from the remote host while runs are active
- **THEN** the orchestrator preserves the state needed to inspect or resume those runs later
- **THEN** reconnecting to the host does not erase active run records

### Requirement: Logs are accessible from the terminal
The system SHALL expose per-run logs and summaries through CLI commands suitable for remote inspection.

#### Scenario: Reading recent run output
- **WHEN** the operator requests logs for a specific run
- **THEN** the system returns terminal-readable output for that run
- **THEN** the operator can request either human-readable summaries or structured output
