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
