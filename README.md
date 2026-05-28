# OS Agents

OS Agents is a PRD-first CLI for project-local feature delivery. Run it inside a host project, let Hans moderate the developer council in a circular table, generate a final ARC42 PRD with PlantUML C4 diagrams, then hand the approved PRD to OpenSpec-driven implementation.

## What it does

- Runs inside the current project and creates runtime state under `.os-agents/`.
- Requires the project root to already be a Git repository with at least one commit.
- Lets Hans call David, Mark, Katy, Mary, and George one by one in an agentic loop.
- Limits every PRD agenda item to at most 2 discussion rounds.
- Writes a final markdown PRD into `features/` with a meaningful filename, version, and date.
- Uses the approved PRD as the source of truth for Hans's final OpenSpec implementation pass.
- Prints short live status lines during `spawn` so the operator can follow the stages and decisions.
- Persists run state, logs, handoff artifacts, and Copilot session state on disk.

## Team model

- **Hans** - orchestrator, moderator, PRD synthesizer, and final AI builder.
- **David** - anti-pattern-heavy explorer who pressure-tests risky directions.
- **Mark** - structured design and UX-minded architect.
- **Katy** - workflow-aware overengineer who expands coverage.
- **Mary** - tooling-first backend pragmatist who pushes reuse.
- **George** - platform, infrastructure, and reliability specialist.

## Install

OS Agents already ships a real CLI binary through the package `bin` entry, so after a **global install** you can run it directly as:

```bash
os-agents init
```

For a Debian or other headless Linux host where you want a direct shell command, install it globally:

```bash
npm install -g @eonio/os-agents
os-agents --help
```

The same global install model works on **Windows PowerShell** and **cmd** too. npm creates the command shims automatically, so after:

```powershell
npm install -g @eonio/os-agents
os-agents --help
```

you can run `os-agents init`, `os-agents list`, and the other commands directly without `node` or `npx`.

Then initialize each project explicitly:

```bash
cd your-project
os-agents init
os-agents list
```

If you prefer a project-local install instead, install in the host project where you want `.os-agents/` and `features/` to be managed:

```bash
npm install @eonio/os-agents
```

Or link it locally while developing this repository:

```bash
npm install
npm run build
npm link
os-agents list
```

## Configuration

OS Agents now supports **JSON config files only**. If present, the CLI reads `os-agents.config.json` from the current project.

Runtime defaults:

- Project root: current working directory
- Runtime root: `.os-agents/`
- PRD output root: `features/`
- Workspace root: `.os-agents/workspaces/`

Environment variables:

- `OS_AGENTS_HOME` - optional override for the runtime root
- `GITHUB_TOKEN` - GitHub API publishing and Copilot authentication
- `COPILOT_MODEL` - default Copilot SDK model

After installation, `os-agents.config-example.json` is copied into the project root if it does not already exist.

The install step also creates or appends to the host project's `.gitignore` so runtime artifacts stay out of version control. By default it ensures these entries exist:

- `node_modules/`
- `.os-agents/`
- `openspec/`

This keeps generated runtime state and OpenSpec working files untracked while leaving final PRDs in `features/` available for versioning.

Example:

```json
{
  "retention": {
    "completed": false,
    "failed": true,
    "cancelled": true
  },
  "github": {
    "token": "YOUR_GITHUB_TOKEN",
    "apiBaseUrl": "https://api.github.com",
    "preferSsh": true,
    "dispatchEventType": "openspec_orchestrator_handoff"
  },
  "copilot": {
    "model": "gpt-5.4",
    "logLevel": "info",
    "remoteSessionMode": "export"
  },
  "workflow": {
    "openspec": {
      "changePrefix": "agent",
      "createChangeCommand": "openspec new change \"{changeName}\"",
      "statusCommand": "openspec status --change \"{changeName}\" --json",
      "applyCommand": "openspec instructions apply --change \"{changeName}\" --json",
      "handoffCommand": "openspec status --change \"{changeName}\" --json"
    }
  }
}
```

## Usage

Initialize the current project first:

```bash
os-agents init
```

If `.os-agents/` is missing, other commands stop and tell you to run `os-agents init`.

Then run against the current project and current branch:

```bash
os-agents spawn \
  --feature "Add billing portal flow" \
  --feature "Refactor webhook retries"
```

Optionally override the base branch:

```bash
os-agents spawn \
  --branch main \
  --feature "Ship PRD-first workflow"
```

Inspect runs:

```bash
os-agents list
os-agents status <run-id>
os-agents logs <run-id> --tail 200
os-agents resume <run-id>
os-agents cancel <run-id>
```

Use `--json` with `spawn`, `list`, `status`, `logs`, `cancel`, and `resume` for automation.

## Smoke test

Recommended first real-world test:

1. Install globally: `npm install -g @eonio/os-agents`
2. Move into a real project folder
3. Run `os-agents init`
4. Confirm the project has:
   - `.os-agents/`
   - updated `.gitignore`
   - a Git repository with at least one commit
5. Run `os-agents spawn --feature "test feature"`

Watch for:

- short live stage messages
- a final PRD written under `features/`
- run records and logs under `.os-agents/`
- fail-fast messages if Git, OpenSpec, or Copilot setup is missing

The most likely real-environment issues are Copilot authentication, OpenSpec availability on `PATH`, and the project's Git/OpenSpec state.

## PRD workflow

For each feature, Hans:

1. Prepares a workspace on a feature branch.
2. Moderates a circular-table PRD discussion across the developer council.
3. Closes each agenda item in 1 or 2 rounds maximum.
4. Writes the final ARC42 PRD with PlantUML C4 diagrams into `features/`.
5. Mirrors that PRD into the implementation workspace.
6. Runs OpenSpec preparation and implements from the PRD.
7. Writes a handoff artifact and optionally publishes a GitHub `repository_dispatch` inferred from the project's `origin` remote.

If the host project is **not** a Git repository yet, OS Agents stops in the first stage and tells you to initialize Git in the project root yourself. If the project has a Git repository but no commits yet, OS Agents also stops and tells you to create the initial commit first. This avoids auto-creating nested repository setups during bootstrap. GitHub dispatch is still skipped unless a GitHub `origin` remote exists.

## Runtime layout

By default, runtime data lives under `.os-agents/` in the host project:

- `runs/` - persisted run records
- `logs/` - per-run logs
- `handoffs/` - JSON handoff artifacts
- `workspaces/` - isolated implementation clones
- `copilot-home/` - Copilot SDK session state

PRDs are written to:

- `features/` - final markdown PRDs with version and date in the filename

## GitHub and CI/CD integration

Every completed run writes a handoff JSON artifact. When `GITHUB_TOKEN` is configured and the project has a GitHub `origin` remote, OS Agents also publishes a `repository_dispatch` event named `openspec_orchestrator_handoff` by default.
