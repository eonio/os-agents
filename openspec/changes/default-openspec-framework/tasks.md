## 1. Workflow abstraction

- [x] 1.1 Introduce workflow-provider domain types and replace direct `SpeckitProvider` usage in the orchestrator with a generic workflow adapter.
- [x] 1.2 Extend configuration loading to support workflow-provider selection, OpenSpec defaults, and provider-specific command settings.
- [x] 1.3 Extend persisted run models and handoff models with workflow-provider identity and OpenSpec change metadata.

## 2. OpenSpec provider implementation

- [x] 2.1 Implement an OpenSpec workflow provider that can create or continue a change and capture change identifiers during the drafting phase.
- [x] 2.2 Implement the OpenSpec post-implementation or handoff step and wire its results into run logs and persisted metadata.
- [x] 2.3 Update Copilot prompt construction and worker logging so they describe OpenSpec as the default workflow.

## 3. Runtime and integration updates

- [x] 3.1 Update the orchestrator worker loop and status surfaces to use workflow-provider metadata instead of Speckit-specific assumptions.
- [x] 3.2 Update GitHub handoff payload generation to include workflow-provider and OpenSpec change details.
- [x] 3.3 Preserve detached-worker resume and recovery behavior for OpenSpec-backed runs.

## 4. Validation and documentation

- [x] 4.1 Update automated tests to cover workflow-provider defaults, OpenSpec metadata persistence, and runtime behavior.
- [x] 4.2 Update README and configuration examples to present OpenSpec as the default spec-driven framework.
