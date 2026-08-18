#!/usr/bin/env bash
# Validates the Terraform skill eval manifest and guardrail coverage.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: validate-evals.sh [--strict-files] [--help]

Validates evals/evals.json relative to the Terraform best-practices skill.

Options:
  --strict-files  Fail when a required eval has no valid scaffold files.
  --help          Show this help text.
EOF
}

strict_files=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --strict-files)
      strict_files=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if ! command -v jq >/dev/null 2>&1; then
  printf 'jq is required to validate evals/evals.json.\n' >&2
  exit 1
fi

script_dir=$(cd -- "$(dirname -- "$0")" && pwd -P)
skill_dir=$(dirname "$script_dir")
manifest="$skill_dir/evals/evals.json"
guardrails="$skill_dir/references/guardrails.md"

if [ ! -f "$manifest" ] || [ ! -f "$guardrails" ]; then
  printf 'Missing manifest or guardrails file under %s.\n' "$skill_dir" >&2
  exit 1
fi

jq -e '
  .skill_name == "terraform-best-practices"
  and (.evals | type == "array" and length > 0)
  and all(.evals[];
    (.id | type == "number")
    and (.name | type == "string" and length > 0)
    and (.prompt | type == "string" and length > 0)
    and (.expected_output | type == "string" and length > 0)
    and (.fixture_required | type == "boolean")
    and (.knowledge_base == "available" or .knowledge_base == "unavailable")
    and (
      (has("follow_up") | not)
      or (.follow_up | type == "string" and length > 0)
    )
    and (.files | type == "array")
    and (.assertions | type == "array" and length > 0)
  )
' "$manifest" >/dev/null

eval_count=$(jq '.evals | length' "$manifest")
unique_ids=$(jq '[.evals[].id] | unique | length' "$manifest")
unique_names=$(jq '[.evals[].name] | unique | length' "$manifest")

if [ "$unique_ids" -ne "$eval_count" ] || [ "$unique_names" -ne "$eval_count" ]; then
  printf 'Eval IDs and names must be unique.\n' >&2
  exit 1
fi

if jq -e '.evals[] | select(.prompt | test("<[^>]+>"))' "$manifest" >/dev/null; then
  printf 'Eval prompts contain unresolved <placeholder> values.\n' >&2
  exit 1
fi

missing_files=0
while IFS= read -r file; do
  if [ ! -f "$skill_dir/$file" ]; then
    printf 'Missing eval fixture: %s\n' "$file" >&2
    missing_files=1
  fi
done < <(jq -r '.evals[].files[]' "$manifest")

if [ "$missing_files" -ne 0 ]; then
  exit 1
fi

invalid_scaffold_files=$(jq -r '
  .evals[]
  | select(.fixture_required)
  | .files[]
  | select(
      test("^evals/scaffolds/(azure-consumer-base|overlays/[^/]+)/repository/.+")
      | not
    )
' "$manifest")

if [ -n "$invalid_scaffold_files" ]; then
  printf 'Required eval files must use a scaffold repository path:\n%s\n' \
    "$invalid_scaffold_files" >&2
  exit 1
fi

empty_file_evals=$(jq -r '.evals[] | select(.fixture_required and (.files | length == 0)) | .name' "$manifest")
if [ -n "$empty_file_evals" ]; then
  while IFS= read -r eval_name; do
    printf 'Warning: eval %s has no repository fixture files.\n' "$eval_name" >&2
  done <<<"$empty_file_evals"

  if [ "$strict_files" -eq 1 ]; then
    exit 1
  fi
fi

missing_base_evals=$(jq -r '
  .evals[]
  | select(
      .fixture_required
      and ([.files[] | startswith("evals/scaffolds/azure-consumer-base/repository/")] | any | not)
    )
  | .name
' "$manifest")

if [ -n "$missing_base_evals" ]; then
  printf 'Required evals without the Azure consumer base:\n%s\n' \
    "$missing_base_evals" >&2
  exit 1
fi

while IFS= read -r eval_name; do
  duplicate_targets=$(
    jq -r --arg eval_name "$eval_name" '
      .evals[]
      | select(.name == $eval_name)
      | .files[]
    ' "$manifest" |
      sed 's#^.*/repository/##' |
      sort |
      uniq -d
  )

  if [ -n "$duplicate_targets" ]; then
    printf 'Eval %s maps multiple scaffold files to the same target:\n%s\n' \
      "$eval_name" \
      "$duplicate_targets" >&2
    exit 1
  fi
done < <(jq -r '.evals[] | select(.fixture_required) | .name' "$manifest")

known_guardrails=$(grep -oE 'TF-G[0-9]{2}' "$guardrails" | sort -u)
referenced_guardrails=$(jq -r '.evals[].assertions[]' "$manifest" |
  grep -oE 'TF-G[0-9]{2}' |
  sort -u)

unknown_guardrails=$(comm -13 <(printf '%s\n' "$known_guardrails") <(printf '%s\n' "$referenced_guardrails"))
missing_guardrails=$(comm -23 <(printf '%s\n' "$known_guardrails") <(printf '%s\n' "$referenced_guardrails"))

if [ -n "$unknown_guardrails" ]; then
  printf 'Unknown guardrail references:\n%s\n' "$unknown_guardrails" >&2
  exit 1
fi

if [ -n "$missing_guardrails" ]; then
  printf 'Guardrails without eval coverage:\n%s\n' "$missing_guardrails" >&2
  exit 1
fi

printf 'Validated %s evals covering %s guardrails.\n' \
  "$eval_count" \
  "$(printf '%s\n' "$known_guardrails" | wc -l | tr -d ' ')"
