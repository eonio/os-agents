## Context

The current runtime treats each requested feature as a single orchestrated run with one OpenSpec workflow and one Copilot implementation session. The requested model introduces a structured team: Hans acts as the orchestration lead, five named developers run in parallel with distinct profiles, each developer owns an isolated OpenSpec workflow, and Hans only advances to the final implementation after collecting, deliberating on, and scoring the team output.

This is more than prompt tuning. The runtime needs explicit persona definitions, a parent-child run relationship, a deliberation state machine, vote tracking, and a final synthesis step that uses the agreed team position rather than any single developer's output.

## Goals / Non-Goals

**Goals:**

- Introduce Hans as the named lead orchestrator for each feature request.
- Spawn five parallel developer agents with stable names, profiles, and OpenSpec workflows.
- Preserve isolated workspaces and detached worker execution for every developer sub-run.
- Add a deliberation phase where Hans compares results, proposes revisions, collects scores, and waits for a consensus threshold of 90 or higher.
- Use the final team agreement as the implementation basis for the final feature outcome.

**Non-Goals:**

- Simulating human communication beyond the structured persona prompts and vote model.
- Adding arbitrary team sizes or fully user-defined personas in the first version.
- Implementing distributed execution across multiple machines; parallelism may stay local to the orchestrator host.

## Decisions

### Decision: Model a feature request as a Hans-led parent run with five developer child runs

The persisted state should distinguish between a team-level orchestration run and the individual developer runs it manages. Hans owns the parent run and each developer gets a child run with a role, workspace, logs, workflow metadata, and result summary.

**Why:** Parent-child state is the clearest way to represent team orchestration while preserving the existing isolated-run behavior as the building block for each developer.

**Alternatives considered:**

- **Store all developers inside one run object with no sub-run identity:** simpler initially, but harder to resume, inspect, and debug per developer.
- **Replace the existing run model entirely:** more disruptive than necessary.

### Decision: Encode personas as first-class runtime configuration

The five developers should be represented by structured persona definitions containing a stable name, role summary, contribution bias, and prompt guidance. Hans should also have an explicit orchestrator profile.

**Why:** The runtime needs durable, inspectable persona data rather than hard-coded prompt fragments scattered across providers.

**Alternatives considered:**

- **Inline persona text in Copilot prompt generation only:** faster to write, but hard to maintain and test.

### Decision: Reuse the existing OpenSpec provider for each developer workflow

Each developer child run should prepare its own OpenSpec change in its own workspace using the existing workflow-provider mechanism. The team layer should orchestrate multiple child runs rather than invent a second workflow system.

**Why:** This preserves the OpenSpec-first architecture already in place and keeps workflow execution consistent across the team.

**Alternatives considered:**

- **One shared OpenSpec change for all developers:** easier to reason about centrally, but violates the requirement that each developer use its own OpenSpec workflow.

### Decision: Represent deliberation as an explicit score-based review loop

After the five developers finish, Hans should collect their summaries, draft a proposed agreement, store per-developer votes, and optionally request another revision round until the aggregate agreement score reaches 90 or higher.

**Why:** The agreement threshold is core product behavior and needs durable state, not just an informal prompt instruction.

**Alternatives considered:**

- **One-pass synthesis with no score tracking:** faster, but does not satisfy the explicit vote and threshold requirement.

### Decision: Separate deliberation from final implementation

Hans should first create the final agreement artifact from the team's deliberation, then use that agreement as the input to the final implementation stage.

**Why:** This matches the requested behavior and creates a clean audit trail from parallel exploration to final execution.

**Alternatives considered:**

- **Let Hans implement directly while deliberating:** conflates consensus-building with delivery and weakens inspectability.

## Risks / Trade-offs

- **[Five parallel developer runs increase runtime cost and latency]** -> Mitigate by keeping developer prompts scoped and by reusing the current detached-worker model.
- **[Team state becomes harder to inspect than single-run state]** -> Mitigate with explicit parent-child identifiers and per-developer status surfaces.
- **[Vote thresholds can stall progress if disagreement persists]** -> Mitigate with a bounded revision loop and visible score reporting.
- **[Persona prompts may overemphasize style quirks over useful output]** -> Mitigate by keeping persona profiles focused on engineering value and review bias rather than roleplay.

## Migration Plan

1. Add persona definitions and team-level run models.
2. Refactor spawning so Hans creates five developer child runs in parallel.
3. Add aggregation and deliberation services that consume child-run results and compute agreement scores.
4. Add the final agreement and Hans implementation step.
5. Update CLI status, tests, and documentation to describe the team model.

Rollback is possible by restoring the current single-run flow if the team layer proves unstable.

## Open Questions

- Resolved: Hans uses a dedicated final workspace for the agreed implementation result.
- Resolved: Hans deliberates for up to 3 rounds and, if the merged solution still stays below 90, discards the merge and implements the best-performing individual Round 1 result.
