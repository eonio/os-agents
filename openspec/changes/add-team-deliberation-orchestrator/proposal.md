## Why

The orchestrator currently treats runs as independent agent executions, but the requested operating model is a coordinated development team led by a named orchestrator who synthesizes multiple specialist viewpoints before implementation. Adding a team-based workflow now allows feature work to benefit from deliberate parallel exploration, structured debate, and a high-confidence final agreement before code is written.

## What Changes

- Add a team orchestration model centered on **Hans** as the orchestration lead.
- Add five named developer personas who all operate as fullstack agents but contribute different biases and strengths: David, Mark, Katy, Mary, and George.
- Require Hans to spawn the five developer agents in parallel, each with an isolated workspace and its own OpenSpec change workflow for the same feature request.
- Add a deliberation phase where Hans compares the developers' OpenSpec results, proposes a vote, coordinates revisions, and tracks agreement scores.
- Require the team to reach an agreement score of 90 or higher before Hans produces the final implementation outcome from the combined result.
- Preserve headless execution, GitHub/Copilot SDK integration, and existing isolated-workspace behavior while shifting the orchestration model from single-run execution to team-based decision making.

## Capabilities

### New Capabilities
- `team-agent-orchestration`: Orchestrate Hans plus five named developer agents as a coordinated team for each feature request.
- `parallel-openspec-workflows`: Run isolated OpenSpec workflows in parallel for each developer persona on the same feature.
- `team-deliberation-voting`: Deliberate across agent outputs, revise proposals, and score team agreement before final implementation.
- `persona-driven-execution`: Encode persistent developer profiles that influence how each agent explores and contributes to a feature.

### Modified Capabilities
- None.

## Impact

- Adds a new team-layer coordination model, persona definitions, deliberation state, and vote aggregation logic.
- Changes how runs are spawned, tracked, and summarized by introducing parallel sub-runs plus a final synthesis phase led by Hans.
- Affects runtime state models, worker orchestration, Copilot prompts, OpenSpec workflow handling, CLI status surfaces, and operator documentation.
