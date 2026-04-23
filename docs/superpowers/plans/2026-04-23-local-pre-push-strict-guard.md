# Local Pre-Push Strict Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict local pre-push guard that blocks pushes when immutable install fails or when local i18n / GraphQL codegen introduces tracked-file drift.

**Architecture:** Keep the hook tiny and move all logic into one repo-owned shell script. The script snapshots tracked status before running codegen, runs the same cheap checks already enforced in CI, then compares tracked status after the run so unrelated local edits do not false-fail the guard.

**Tech Stack:** Husky, Bash, Yarn 4, AFFiNE monorepo CLI

---

## File Map

- Create: `.husky/pre-push`
  - Thin hook.
  - Only delegates to the package script.
- Create: `scripts/pre-push-strict.sh`
  - Runs immutable install.
  - Runs i18n + GraphQL codegen.
  - Compares tracked git status before vs after.
  - Prints short fix messages.
- Modify: `package.json`
  - Add one manual entry point: `pre-push:strict`

### Task 1: Build The Pre-Push Runner

**Files:**

- Create: `scripts/pre-push-strict.sh`

- [ ] **Step 1: Write the runner script**

Create `scripts/pre-push-strict.sh` with this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

before_status="$(git status --porcelain --untracked-files=no)"

print_fix_message() {
  cat <<'EOF'
[pre-push] Fix the reported issue locally before pushing.
[pre-push] If generated files changed, review them, add them, and retry.
EOF
}

run_step() {
  local label="$1"
  shift

  echo "[pre-push] $label"
  if ! "$@"; then
    print_fix_message
    exit 1
  fi
}

run_step "Checking immutable install" yarn --immutable --inline-builds
run_step "Building i18n outputs" yarn affine @affine/i18n build
run_step "Building GraphQL outputs" yarn affine gql build

after_status="$(git status --porcelain --untracked-files=no)"

if [[ "$after_status" != "$before_status" ]]; then
  echo "[pre-push] Generated tracked files changed:"
  printf '%s\n' "$after_status"
  echo "[pre-push] Commands run:"
  echo "  yarn --immutable --inline-builds"
  echo "  yarn affine @affine/i18n build"
  echo "  yarn affine gql build"
  print_fix_message
  exit 1
fi

echo "[pre-push] OK"
```

- [ ] **Step 2: Mark the runner executable**

Run:

```bash
chmod +x scripts/pre-push-strict.sh
```

Expected:

```text
No output. Exit code 0.
```

- [ ] **Step 3: Verify shell syntax**

Run:

```bash
bash -n scripts/pre-push-strict.sh
```

Expected:

```text
No output. Exit code 0.
```

- [ ] **Step 4: Dry-run the runner directly**

Run:

```bash
bash scripts/pre-push-strict.sh
```

Expected on the current `canary` branch:

```text
[pre-push] Checking immutable install
YN0028: +    "@blocksuite/affine-inline-preset": "workspace:*"
YN0028: The lockfile would have been modified by this install, which is explicitly forbidden.
```

Notes:

- This failure is acceptable at this step.
- It confirms the new guard would block the same lockfile/workspace drift that currently fails in GitHub Actions.

### Task 2: Wire The Manual Command And Hook

**Files:**

- Modify: `package.json`
- Create: `.husky/pre-push`

- [ ] **Step 1: Add the manual package script**

Modify the root `package.json` scripts block to include:

```json
{
  "scripts": {
    "affine": "r affine.ts",
    "af": "r affine.ts",
    "dev": "yarn affine dev",
    "build": "yarn affine build",
    "lint:eslint": "cross-env NODE_OPTIONS=\"--max-old-space-size=16384\" eslint --report-unused-disable-directives-severity=off . --cache",
    "lint:eslint:fix": "yarn lint:eslint --fix --fix-type problem,suggestion,layout",
    "lint:prettier": "prettier --ignore-unknown --cache --check .",
    "lint:prettier:fix": "prettier --ignore-unknown --cache --write .",
    "lint:ox": "oxlint --deny-warnings",
    "lint:ox:fix": "yarn lint:ox --fix",
    "lint": "yarn lint:ox && yarn lint:eslint && yarn lint:prettier",
    "lint:fix": "yarn lint:ox:fix && yarn lint:eslint:fix && yarn lint:prettier:fix",
    "test": "vitest --run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc -b tsconfig.json --verbose",
    "pre-push:strict": "bash ./scripts/pre-push-strict.sh",
    "postinstall": "yarn affine init && yarn husky"
  }
}
```

- [ ] **Step 2: Create the Husky hook**

Create `.husky/pre-push` with this content:

```sh
yarn pre-push:strict
```

- [ ] **Step 3: Mark the hook executable**

Run:

```bash
chmod +x .husky/pre-push
```

Expected:

```text
No output. Exit code 0.
```

- [ ] **Step 4: Verify the manual package entry point**

Run:

```bash
yarn pre-push:strict
```

Expected on the current `canary` branch:

```text
[pre-push] Checking immutable install
YN0028: +    "@blocksuite/affine-inline-preset": "workspace:*"
YN0028: The lockfile would have been modified by this install, which is explicitly forbidden.
```

- [ ] **Step 5: Verify the Husky hook path**

Run:

```bash
sh .husky/pre-push
```

Expected on the current `canary` branch:

```text
[pre-push] Checking immutable install
YN0028: +    "@blocksuite/affine-inline-preset": "workspace:*"
YN0028: The lockfile would have been modified by this install, which is explicitly forbidden.
```

### Task 3: Verify Pass And Drift Cases

**Files:**

- Modify: `packages/common/graphql/src/graphql/license/activate-license.gql`
- Inspect: `packages/common/graphql/src/graphql/index.ts`
- Inspect: `packages/common/graphql/src/schema.ts`

- [ ] **Step 1: Verify the pass case after the current lockfile issue is fixed**

Prereq:

- update `yarn.lock` / workspace metadata so `yarn --immutable --inline-builds` passes

Run:

```bash
yarn pre-push:strict
```

Expected:

```text
[pre-push] Checking immutable install
[pre-push] Building i18n outputs
[pre-push] Building GraphQL outputs
[pre-push] OK
```

- [ ] **Step 2: Create a scratch GraphQL input change that forces generated drift**

Temporarily change `packages/common/graphql/src/graphql/license/activate-license.gql` from:

```graphql
mutation activateLicense($workspaceId: String!, $license: String!) {
  activateLicense(workspaceId: $workspaceId, license: $license) {
    ...licenseBody
  }
}
```

to:

```graphql
mutation activateLicenseScratch($workspaceId: String!, $license: String!) {
  activateLicense(workspaceId: $workspaceId, license: $license) {
    ...licenseBody
  }
}
```

- [ ] **Step 3: Run the guard and verify tracked-file drift is blocked**

Run:

```bash
yarn pre-push:strict
```

Expected:

```text
[pre-push] Checking immutable install
[pre-push] Building i18n outputs
[pre-push] Building GraphQL outputs
[pre-push] Generated tracked files changed:
 M packages/common/graphql/src/graphql/index.ts
 M packages/common/graphql/src/schema.ts
```

Notes:

- `packages/common/graphql/src/graphql/license/activate-license.gql` was already dirty before the run, so it should not fail the baseline comparison by itself.
- The failure should come from generated tracked files changing after `yarn affine gql build`.

- [ ] **Step 4: Revert the scratch verification change**

Run:

```bash
git restore packages/common/graphql/src/graphql/license/activate-license.gql packages/common/graphql/src/graphql/index.ts packages/common/graphql/src/schema.ts
```

Expected:

```text
No output. Exit code 0.
```

- [ ] **Step 5: Re-run the guard on a clean tree**

Run:

```bash
yarn pre-push:strict
```

Expected:

```text
[pre-push] Checking immutable install
[pre-push] Building i18n outputs
[pre-push] Building GraphQL outputs
[pre-push] OK
```
