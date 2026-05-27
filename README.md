# OpenSpec Copilot Agents

Headless CLI for running Hans-led repository teams in parallel. For each feature request, Hans orchestrates five fullstack developer agents - David, Mark, Katy, Mary, and George - each in its own isolated workspace and OpenSpec workflow before Hans drives deliberation, agreement, and final implementation in a dedicated final workspace. Handoff metadata is emitted for GitHub Actions and other CI/CD consumers.

## What it does

- Spawns a Hans-led team for each feature request from one SSH session.
- Runs David, Mark, Katy, Mary, and George in parallel with isolated workspaces and OpenSpec changes.
- Persists parent and child run state, logs, agreement data, Copilot session IDs, and handoff artifacts on disk.
- Uses Hans to deliberate on developer outputs for up to 3 rounds and targets an agreement score of 90 or higher before final implementation; if the merged council solution still misses 90 by Round 3, Hans falls back to the best individual Round 1 result.
- Creates a dedicated final workspace for Hans to implement the agreed result after deliberation.
- Executes configurable workflow-provider steps around the OpenSpec-first delivery flow.
- Publishes a `repository_dispatch` event to GitHub when a run reaches handoff if `GITHUB_TOKEN` is available.

## Team model

- **Hans** - orchestrator who leads the team, synthesizes results, tracks agreement, and performs final implementation.
- **David** - anti-pattern-heavy fullstack explorer; verbose, risky, and useful for stress-testing ideas.
- **Mark** - structured fullstack design-pattern thinker with strong UI/UX instincts.
- **Katy** - overengineering but workflow-aware fullstack contributor who often surfaces valuable data and process concerns.
- **Mary** - backend/tooling-focused fullstack engineer who cares about CLI ergonomics, helpers, and avoiding repetition.
- **George** - DevOps, cloud, platform, and database focused fullstack engineer.

## Install

```bash
npm install
npm run build
```

Run directly:

```bash
node dist/index.js list
```

Or make it available as a global command:

```bash
npm link
openspec-agents list
```

## Configuration

The CLI looks for `openspec-agents.config.yaml`, `openspec-agents.config.yml`, or `openspec-agents.config.json` in the current working directory. It also respects:

- `OPENSPEC_AGENTS_HOME` for the runtime state root
- `GITHUB_TOKEN` for GitHub API publishing and Copilot authentication
- `COPILOT_MODEL` for the default SDK model

Example config:

```yaml
stateRoot: /srv/openspec-agents
workspaceRoot: /srv/openspec-agents/workspaces

retention:
  completed: false
  failed: true
  cancelled: true

github:
  preferSsh: true
  dispatchEventType: speckit_orchestrator_handoff

copilot:
  model: gpt-5.4
  remoteSessionMode: export

workflow:
  defaultProvider: openspec

  openspec:
    changePrefix: agent
    createChangeCommand: openspec new change "{changeName}"
    statusCommand: openspec status --change "{changeName}" --json
    applyCommand: openspec instructions apply --change "{changeName}" --json
    handoffCommand: openspec status --change "{changeName}" --json

  speckit:
    draftCommand: speckit draft --feature "{feature}" --run-id {runId}
    handoffCommand: speckit handoff --run-id {runId} --branch {featureBranch}
```

## Usage

Spawn a Hans-led team against the same repository and base branch:

```bash
openspec-agents spawn \
  --repo owner/repo \
  --branch main \
  --feature "Add billing portal flow" \
  --feature "Refactor webhook retries"
```

Inspect and recover runs:

```bash
openspec-agents list
openspec-agents status <run-id>
openspec-agents logs <run-id> --tail 200
openspec-agents resume <run-id>
openspec-agents cancel <run-id>
```

Use `--json` on `spawn`, `list`, `status`, `logs`, `cancel`, and `resume` for automation-friendly output. Team-aware status now includes run kind, persona, parent linkage, and final agreement score when available.

## Runtime layout

By default, runtime data lives under `~/.openspec-agents`:

- `runs/` - persisted run records
- `logs/` - per-run logs
- `handoffs/` - JSON handoff artifacts
- `workspaces/` - per-agent clones
- `copilot-home/` - Copilot SDK session state

## GitHub and CI/CD integration

Every completed run writes a handoff JSON artifact. When `GITHUB_TOKEN` is configured and the repository input resolves to `owner/repo`, the orchestrator also publishes a GitHub `repository_dispatch` event named `speckit_orchestrator_handoff` by default. The payload now includes workflow-provider details and OpenSpec change metadata so GitHub Actions can continue validation, PR creation, or deployment orchestration with workflow context.

## Linux / SSH operating model

The `spawn` command launches detached worker processes, so runs survive terminal disconnects on a remote Linux machine. Hans and all five developer agents run through detached workers, and operators can reconnect over SSH and use `list`, `status`, `logs`, and `resume` without needing a GUI or persistent shell session. The default detached workflow uses OpenSpec commands during preparation and handoff for Hans and each developer.
