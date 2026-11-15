# OpenSpec

[Development guide](DEVELOPMENT.md) · [Official setup guide](https://openspec.dev/docs/setup)

OpenSpec is a pinned development dependency, not part of the website's browser bundle. Its default `spec-driven` workflow and six core Codex skills are configured in this repository.

## Setup

```bash
nix develop
pnpm install --frozen-lockfile
pnpm openspec --version
pnpm openspec list
```

No global install is required. The `pnpm openspec` wrapper disables OpenSpec telemetry for that invocation. Use it in place of bare `openspec` commands shown in generated skills and upstream examples.

The shared skills are committed under `.agents/skills/`. Restart the IDE session after installation so it discovers them. To regenerate the core Codex integration after a deliberate dependency upgrade:

```bash
pnpm openspec init --tools codex --profile core --no-animation
```

Review generated changes before committing. Keep the CLI version and generated skills in sync.

## Workflow

In the Codex chat, invoke a skill with your request:

```text
$openspec-propose Describe the change you want
$openspec-apply-change change-name
$openspec-archive-change change-name
```

Review the proposal, specs, design, and tasks before implementation. Run the relevant [tests](TESTING.md) before archiving. Use `$openspec-explore` to investigate an idea, `$openspec-update-change` to revise a plan, and `$openspec-sync-specs` to merge spec updates without archiving.

Inspect and validate a change from the terminal:

```bash
pnpm openspec list
pnpm openspec status --change change-name
pnpm openspec validate change-name --strict
```

Replace `change-name` with the actual change directory name.

## Repository files

- `openspec/config.yaml`: project constraints and artifact rules.
- `openspec/specs/`: specifications for implemented capabilities.
- `openspec/changes/`: active proposals, specs, designs, and tasks.
- `openspec/changes/archive/`: completed changes.
- `.agents/skills/openspec-*/`: generated workflow instructions.

Specs and changes start empty. Installation does not invent specifications for existing code or create an active change. Track artifacts alongside implementation; keep `.env` and unrelated agent state ignored.
