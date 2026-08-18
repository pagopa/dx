#!/usr/bin/env bash
# Materializes one Terraform skill eval as a disposable Git repository.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scaffold-eval.sh <eval-name> <destination>

Builds a deterministic repository fixture from evals/evals.json, then commits
the untouched baseline. The destination must not exist or must be empty.

This script performs no network, cloud, DX CLI, or Terraform operations.
EOF
}

if [ "$#" -eq 1 ] && { [ "$1" = "--help" ] || [ "$1" = "-h" ]; }; then
  usage
  exit 0
fi

if [ "$#" -ne 2 ]; then
  usage >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  printf 'jq is required to read evals/evals.json.\n' >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf 'git is required to create the fixture baseline.\n' >&2
  exit 1
fi

eval_name=$1
destination=$2

script_dir=$(cd -- "$(dirname -- "$0")" && pwd -P)
skill_dir=$(dirname "$script_dir")
manifest="$skill_dir/evals/evals.json"

if ! jq -e --arg eval_name "$eval_name" '
  any(.evals[]; .name == $eval_name and .fixture_required and (.files | length > 0))
' "$manifest" >/dev/null; then
  printf 'Unknown eval or eval without a repository fixture: %s\n' "$eval_name" >&2
  exit 1
fi

mkdir -p -- "$destination"

if [ -n "$(find "$destination" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  printf 'Destination must be empty: %s\n' "$destination" >&2
  exit 1
fi

destination=$(cd -- "$destination" && pwd -P)

while IFS= read -r file; do
  case "$file" in
    evals/scaffolds/*/repository/*)
      ;;
    *)
      printf 'Invalid scaffold path for eval %s: %s\n' "$eval_name" "$file" >&2
      exit 1
      ;;
  esac

  source_file="$skill_dir/$file"
  relative_path=${file#*/repository/}
  target_file="$destination/$relative_path"

  if [ ! -f "$source_file" ]; then
    printf 'Missing scaffold source: %s\n' "$source_file" >&2
    exit 1
  fi

  if [ -e "$target_file" ]; then
    printf 'Multiple scaffold files map to %s.\n' "$relative_path" >&2
    exit 1
  fi

  mkdir -p -- "$(dirname -- "$target_file")"
  cp -- "$source_file" "$target_file"
done < <(
  jq -r --arg eval_name "$eval_name" '
    .evals[]
    | select(.name == $eval_name)
    | .files[]
  ' "$manifest"
)

git -C "$destination" init --quiet
git -C "$destination" config user.name "Terraform Skill Evals"
git -C "$destination" config user.email "terraform-skill-evals@example.invalid"
git -C "$destination" add .
git -C "$destination" commit --quiet -m "Baseline Terraform eval fixture"

prompt=$(
  jq -r --arg eval_name "$eval_name" '
    .evals[]
    | select(.name == $eval_name)
    | .prompt
  ' "$manifest"
)

printf 'Workspace: %s\n' "$destination"
printf 'Eval: %s\n' "$eval_name"
if [ -n "${DX_KB_PATH:-}" ]; then
  printf 'DX_KB_PATH: %s\n' "$DX_KB_PATH"
else
  printf 'DX_KB_PATH: not set; point it to a read-only pagopa/dx checkout.\n'
fi
printf '\nPrompt:\n%s\n' "$prompt"
