## 1. Team runtime models

- [x] 1.1 Add team-level domain models for Hans, developer personas, child runs, deliberation rounds, and agreement scores.
- [x] 1.2 Extend persisted run state and handoff models to represent Hans-led parent runs plus linked developer child runs.
- [x] 1.3 Add default persona definitions for David, Mark, Katy, Mary, and George.

## 2. Parallel developer execution

- [x] 2.1 Refactor spawning so Hans creates five named developer child runs for each feature request.
- [x] 2.2 Preserve isolated workspaces and OpenSpec workflow preparation for every developer child run.
- [x] 2.3 Update prompt generation so Hans and each developer receive role-specific instructions while remaining fullstack contributors.

## 3. Deliberation and agreement

- [x] 3.1 Implement collection of developer summaries into a Hans-led deliberation phase.
- [x] 3.2 Add score-based agreement tracking with a threshold of 90 before final implementation proceeds.
- [x] 3.3 Implement a final Hans agreement artifact and use it as the basis for the final implementation step.

## 4. Status, validation, and docs

- [x] 4.1 Update CLI status and log surfaces to expose team runs, child runs, personas, and agreement state.
- [x] 4.2 Add automated tests for team spawning, parallel developer metadata, deliberation scoring, and final agreement behavior.
- [x] 4.3 Update README and examples to describe Hans, the five developers, and the team-based OpenSpec workflow.
