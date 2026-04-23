# Local Pre-Push Strict Guard Design

Date: 2026-04-23
Status: Approved for planning

## Summary

Add a repo-owned pre-push guard.

Phase 1 is `Small+`.

Before push:

- run immutable Yarn install
- run cheap generated-file checks
- fail if tracked files changed

Goal:

- catch lockfile drift
- catch codegen drift
- stop these failures before GitHub Actions

## Goals

- Block push when `yarn.lock` or workspace metadata is stale.
- Block push when local codegen changes tracked files.
- Keep hook logic simple.
- Keep phase 1 cheap enough to run on every push.

## Non-goals

- Full CI parity.
- Local artifact orchestration.
- Running lint, typecheck, unit, or e2e in phase 1.
- Auto-fixing changed files in the hook.
- Solving flaky tests in this phase.
- Editing GitHub Actions workflows.

## User-Visible Behavior

On `git push`:

1. Husky runs repo pre-push script.
2. Script runs immutable install.
3. Script runs selected codegen commands.
4. Script checks for tracked file drift.
5. Any failure blocks push.

Manual run should also be available from the terminal/editor through one package script.

## Files

- `.husky/pre-push`
- `scripts/pre-push-strict.sh`
- `package.json`

## Technical Design

### Hook

`.husky/pre-push` stays tiny.

It should only call the repo-owned script.

This keeps future expansion in one place.

### Script

`scripts/pre-push-strict.sh` should:

1. `cd` to repo root
2. capture tracked status with `git status --porcelain --untracked-files=no`
3. run `yarn --immutable --inline-builds`
4. run `yarn affine @affine/i18n build`
5. run `yarn affine gql build`
6. inspect `git status --porcelain --untracked-files=no` again
7. fail if tracked status changed

The script should stop on first command failure.

The drift check should ignore untracked files.

The drift check should compare tracked status before and after the codegen commands.

The drift check should treat any new tracked-file drift introduced by the script as failure.

It should not clean files automatically.

### Package Script

Add one package script for manual use, for example:

- `pre-push:strict`

This gives one stable entry point for terminal use and editor task wiring later.

## Failure Messages

### Immutable install failure

Fail immediately.

Print short guidance to update the lockfile or workspace metadata locally before pushing.

### Codegen drift failure

Print:

- that generated tracked files changed
- the changed file list from `git status --porcelain --untracked-files=no`
- the commands already run by the hook

Pre-existing tracked edits that were already present before the hook started should not fail the drift check by themselves.

Do not reset or checkout files.

## Why This Scope

- It directly covers the current failure class from Actions run `24760435837`.
- It is the smallest useful strict gate.
- It matches existing CI checks already enforced in this repo.
- It avoids heavy push-time cost for now.

## Risks

- Pushes get slower than today.
- Some CI-only failures will still escape phase 1.
- `gql build` may be more expensive than the rest of the hook, but still much cheaper than full test parity.

## Testing

Verify 3 cases:

1. clean repo => script passes
2. stale lockfile/workspace change => immutable install fails
3. generated-file drift => script fails and prints changed files

## Future Expansion

Later phases may add:

- lint
- typecheck
- targeted local tests
- broader local CI entry points

Phase 1 should not pre-decide that shape.
