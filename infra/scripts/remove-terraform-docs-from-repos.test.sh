#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_TO_TEST="$SCRIPT_DIR/remove-terraform-docs-from-repos.sh"
TMP_DIR="$(mktemp -d)"
TEST_COUNT=0

# shellcheck source=remove-terraform-docs-from-repos.sh
source "$SCRIPT_TO_TEST"

trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "FAILED: $*" >&2
  exit 1
}

run_test() {
  local test_name="$1"

  TEST_COUNT=$((TEST_COUNT + 1))
  echo "Running test: $test_name"
  "$test_name"
}

assert_contains() {
  local file_path="$1"
  local expected="$2"

  grep -Fq "$expected" "$file_path" || fail "Expected $file_path to contain: $expected"
}

assert_not_contains() {
  local file_path="$1"
  local unexpected="$2"

  if grep -Fq "$unexpected" "$file_path"; then
    fail "Expected $file_path not to contain: $unexpected"
  fi
}

test_sh_invocation_reexecs_bash() {
  local output_file="$TMP_DIR/sh-help-output.txt"

  sh "$SCRIPT_TO_TEST" --help >"$output_file"

  assert_contains "$output_file" "Usage:"
  assert_contains "$output_file" "remove-terraform-docs-from-repos.sh"
}

test_pre_commit_cleanup_removes_terraform_docs_hooks() {
  local test_dir="$TMP_DIR/pre-commit"
  local config_file="$test_dir/.pre-commit-config.yaml"

  mkdir -p "$test_dir"
  cat >"$config_file" <<'YAML'
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_fmt
      - id: terraform_docs
        name: terraform_docs on resources
        args:
          - --hook-config=--create-file-if-not-exist=true
        exclude: |
          (?x)^(
            infra/modules/.*
          )$
      - id: terraform_validate
        args:
          - --args=-json
  - repo: https://example.com/only-docs
    rev: v1
    hooks:
      - id: terraform_docs
        args:
          - --hook-config=--create-file-if-not-exist=true
  - repo: local
    hooks:
      - id: custom_hook
        name: Custom hook
YAML

  cleanup_pre_commit_config "$config_file"

  assert_contains "$config_file" "terraform_fmt"
  assert_contains "$config_file" "terraform_validate"
  assert_contains "$config_file" "custom_hook"
  assert_not_contains "$config_file" "terraform_docs"
  assert_not_contains "$config_file" "https://example.com/only-docs"
}

test_readme_cleanup_keeps_only_local_documentation() {
  local test_dir="$TMP_DIR/readmes"
  local generated_readme="$test_dir/infra/resources/dev/README.md"
  local heading_readme="$test_dir/infra/resources/uat/README.md"
  local local_readme="$test_dir/infra/resources/_modules/api/README.md"

  mkdir -p \
    "$(dirname "$generated_readme")" \
    "$(dirname "$heading_readme")" \
    "$(dirname "$local_readme")"

  cat >"$generated_readme" <<'MARKDOWN'
<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.
<!-- END_TF_DOCS -->
MARKDOWN

  cat >"$heading_readme" <<'MARKDOWN'
# Dev Environment

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.
<!-- END_TF_DOCS -->
MARKDOWN

  cat >"$local_readme" <<'MARKDOWN'
# API Module

This module creates the API resources.

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.
<!-- END_TF_DOCS -->

## Usage

Use this module from environment folders.
MARKDOWN

  (
    cd "$test_dir"
    cleanup_readmes
  )

  [[ ! -e "$generated_readme" ]] || fail "Generated-only README should have been deleted"
  [[ ! -e "$heading_readme" ]] || fail "Heading-only README should have been deleted"
  [[ -f "$local_readme" ]] || fail "Local README should have been kept"
  assert_contains "$local_readme" "This module creates the API resources."
  assert_contains "$local_readme" "## Usage"
  assert_not_contains "$local_readme" "BEGIN_TF_DOCS"
  assert_not_contains "$local_readme" "No requirements."
}

test_dry_run_is_resumable() {
  local remote_dir="$TMP_DIR/remote.git"
  local seed_dir="$TMP_DIR/seed"
  local work_dir="$TMP_DIR/work"
  local cloned_dir
  local first_commit
  local second_commit
  local first_ahead_count
  local second_ahead_count

  git init --bare "$remote_dir" --quiet
  git init "$seed_dir" --quiet
  git -C "$seed_dir" checkout -b main --quiet

  mkdir -p "$seed_dir/infra/resources/dev"
  cat >"$seed_dir/.pre-commit-config.yaml" <<'YAML'
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_fmt
      - id: terraform_docs
        name: terraform_docs on resources
        args:
          - --hook-config=--create-file-if-not-exist=true
      - id: terraform_validate
YAML

  cat >"$seed_dir/infra/resources/dev/README.md" <<'MARKDOWN'
# Dev Environment

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.
<!-- END_TF_DOCS -->
MARKDOWN

  git -C "$seed_dir" add .
  git -C "$seed_dir" \
    -c user.name="DX Test" \
    -c user.email="dx-test@example.com" \
    commit -m "Initial commit" --quiet
  git -C "$seed_dir" remote add origin "$remote_dir"
  git -C "$seed_dir" push -u origin main --quiet
  git --git-dir="$remote_dir" symbolic-ref HEAD refs/heads/main

  GIT_AUTHOR_NAME="DX Test" \
    GIT_AUTHOR_EMAIL="dx-test@example.com" \
    GIT_COMMITTER_NAME="DX Test" \
    GIT_COMMITTER_EMAIL="dx-test@example.com" \
    bash "$SCRIPT_TO_TEST" --dry-run --work-dir "$work_dir" "$remote_dir"

  cloned_dir="$work_dir/$(safe_repo_dir_name "$remote_dir")"
  first_commit="$(git -C "$cloned_dir" rev-parse HEAD)"
  first_ahead_count="$(git -C "$cloned_dir" rev-list --count "origin/main..HEAD")"

  GIT_AUTHOR_NAME="DX Test" \
    GIT_AUTHOR_EMAIL="dx-test@example.com" \
    GIT_COMMITTER_NAME="DX Test" \
    GIT_COMMITTER_EMAIL="dx-test@example.com" \
    bash "$SCRIPT_TO_TEST" --dry-run --work-dir "$work_dir" "$remote_dir"

  second_commit="$(git -C "$cloned_dir" rev-parse HEAD)"
  second_ahead_count="$(git -C "$cloned_dir" rev-list --count "origin/main..HEAD")"

  [[ "$first_commit" == "$second_commit" ]] || fail "Dry-run should reuse the prepared commit"
  [[ "$first_ahead_count" == "1" ]] || fail "Expected first dry-run branch to be one commit ahead"
  [[ "$second_ahead_count" == "1" ]] || fail "Expected second dry-run branch to remain one commit ahead"
  [[ ! -e "$cloned_dir/infra/resources/dev/README.md" ]] || fail "Generated README should have been deleted"
  assert_not_contains "$cloned_dir/.pre-commit-config.yaml" "terraform_docs"
}

run_test test_sh_invocation_reexecs_bash
run_test test_pre_commit_cleanup_removes_terraform_docs_hooks
run_test test_readme_cleanup_keeps_only_local_documentation
run_test test_dry_run_is_resumable

echo "All $TEST_COUNT tests passed."
