#!/usr/bin/env bash
# Runs Terraform skill evals with current and baseline variants, then grades them.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: run-evals.sh [options]

Runs repository fixtures through Copilot CLI without interactive input, grades
current and baseline variants, and writes a comparison report.

Options:
  --eval <name>          Run only this eval. May be repeated.
  --output <directory>  Store artifacts in this empty directory.
  --baseline-ref <ref>  Use this Git ref for the baseline skill.
  --dry-run              Prepare plugins and workspaces without invoking Copilot.
  --help                 Show this help text.

Environment:
  COPILOT_BIN                     Copilot CLI executable. Default: copilot
  COPILOT_EVAL_MODEL              Model for eval runs. Default: gpt-5.6-sol
  COPILOT_EVAL_GRADER_MODEL       Model for grading. Default: gpt-5-mini
  COPILOT_EVAL_REASONING_EFFORT   Reasoning effort. Default: high
  COPILOT_EVAL_MAX_AI_CREDITS     Per-session AI credit limit. Default: 30
  DX_KB_PATH                      Existing pagopa/dx knowledge-base checkout

By default all evals run. The previous committed version of SKILL.md is used as
the baseline when Git history is available; otherwise the baseline runs without
the skill.
EOF
}

script_dir=$(cd -- "$(dirname -- "$0")" && pwd -P)
skill_dir=$(dirname "$script_dir")
invocation_cwd=$(pwd -P)
manifest="$skill_dir/evals/evals.json"
rubric="$skill_dir/evals/rubric.md"
grader_instructions="$skill_dir/evals/grader.md"
validator="$script_dir/validate-evals.sh"
scaffolder="$script_dir/scaffold-eval.sh"

copilot_bin=${COPILOT_BIN:-copilot}
main_model=${COPILOT_EVAL_MODEL:-gpt-5.6-sol}
grader_model=${COPILOT_EVAL_GRADER_MODEL:-gpt-5-mini}
reasoning_effort=${COPILOT_EVAL_REASONING_EFFORT:-high}
max_ai_credits=${COPILOT_EVAL_MAX_AI_CREDITS:-30}
baseline_ref=${COPILOT_EVAL_BASELINE_REF:-}
main_tools="bash,read_bash,stop_bash,list_bash,apply_patch,view,web_fetch,skill,rg,glob"
grader_tools="view"
output_dir=""
dry_run=0
requested_evals=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --eval)
      if [ "$#" -lt 2 ]; then
        printf 'Missing value for --eval.\n' >&2
        exit 2
      fi
      requested_evals[${#requested_evals[@]}]=$2
      shift
      ;;
    --output)
      if [ "$#" -lt 2 ]; then
        printf 'Missing value for --output.\n' >&2
        exit 2
      fi
      output_dir=$2
      shift
      ;;
    --baseline-ref)
      if [ "$#" -lt 2 ]; then
        printf 'Missing value for --baseline-ref.\n' >&2
        exit 2
      fi
      baseline_ref=$2
      shift
      ;;
    --dry-run)
      dry_run=1
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

for command_name in "$copilot_bin" jq git tar; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf '%s is required to run the eval suite.\n' "$command_name" >&2
    exit 1
  fi
done

"$validator" --strict-files

selected_evals=()
if [ "${#requested_evals[@]}" -eq 0 ]; then
  while IFS= read -r eval_name; do
    selected_evals[${#selected_evals[@]}]=$eval_name
  done < <(jq -r '.evals[].name' "$manifest")
else
  for eval_name in "${requested_evals[@]}"; do
    if ! jq -e --arg eval_name "$eval_name" \
      'any(.evals[]; .name == $eval_name)' "$manifest" >/dev/null; then
      printf 'Unknown eval: %s\n' "$eval_name" >&2
      exit 1
    fi
    selected_evals[${#selected_evals[@]}]=$eval_name
  done
fi

if [ -z "$output_dir" ]; then
  run_timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
  output_dir="${TMPDIR:-/tmp}/terraform-best-practices-evals/$run_timestamp"
fi

mkdir -p -- "$output_dir"
if [ -n "$(find "$output_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  printf 'Output directory must be empty: %s\n' "$output_dir" >&2
  exit 1
fi
output_dir=$(cd -- "$output_dir" && pwd -P)

runtime_dir="$output_dir/runtime"
mkdir -p -- "$runtime_dir"

new_session_id() {
  local hex

  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
    return
  fi

  hex=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
  printf '%s-%s-%s-%s-%s\n' \
    "${hex:0:8}" \
    "${hex:8:4}" \
    "${hex:12:4}" \
    "${hex:16:4}" \
    "${hex:20:12}"
}

create_plugin() {
  local source_skill=$1
  local target_plugin=$2
  local plugin_name=$3
  local target_skill="$target_plugin/skills/terraform-best-practices"

  mkdir -p -- "$target_plugin/.plugin" "$target_skill"
  tar -C "$source_skill" \
    --exclude='./evals/runs' \
    -cf - . |
    tar -C "$target_skill" -xf -

  cat >"$target_plugin/.plugin/plugin.json" <<EOF
{
  "name": "$plugin_name",
  "description": "Isolated plugin wrapper for terraform-best-practices evals",
  "version": "0.0.0"
}
EOF
}

create_empty_plugin() {
  local target_plugin=$1
  local plugin_name=$2

  mkdir -p -- "$target_plugin/.plugin" "$target_plugin/skills"
  cat >"$target_plugin/.plugin/plugin.json" <<EOF
{
  "name": "$plugin_name",
  "description": "Isolated plugin wrapper for terraform-best-practices evals",
  "version": "0.0.0"
}
EOF
}

copy_supporting_skill() {
  local source_skill=$1
  local target_plugin=$2
  local skill_name=$3
  local target_skill="$target_plugin/skills/$skill_name"

  mkdir -p -- "$target_skill"
  tar -C "$source_skill" -cf - . |
    tar -C "$target_skill" -xf -
}

repo_root=""
skill_relative_path=""
if repo_root_candidate=$(git -C "$skill_dir" rev-parse --show-toplevel 2>/dev/null); then
  repo_root=$repo_root_candidate
  skill_relative_path=${skill_dir#"$repo_root"/}
fi

baseline_plugin=""
baseline_label="without-skill"
current_plugin="$runtime_dir/current-plugin"
create_plugin "$skill_dir" "$current_plugin" "terraform-eval-current"

if [ -n "$repo_root" ]; then
  if [ -z "$baseline_ref" ]; then
    baseline_ref=$(
      git -C "$repo_root" log --format='%H' -- "$skill_relative_path/SKILL.md" |
        sed -n '2p'
    )
  fi

  if [ -n "$baseline_ref" ] &&
    git -C "$repo_root" cat-file -e \
      "$baseline_ref:$skill_relative_path/SKILL.md" 2>/dev/null; then
    baseline_source_root="$runtime_dir/baseline-source"
    mkdir -p -- "$baseline_source_root"
    git -C "$repo_root" archive "$baseline_ref" "$skill_relative_path" |
      tar -C "$baseline_source_root" -xf -

    baseline_plugin="$runtime_dir/baseline-plugin"
    create_plugin \
      "$baseline_source_root/$skill_relative_path" \
      "$baseline_plugin" \
      "terraform-eval-baseline"
    baseline_label="git:$baseline_ref"
  fi
fi

if [ -z "$baseline_plugin" ]; then
  baseline_plugin="$runtime_dir/baseline-plugin"
  create_empty_plugin "$baseline_plugin" "terraform-eval-baseline"
fi

skill_list_json=$("$copilot_bin" -C "$invocation_cwd" skill list --json 2>/dev/null || printf '[]')

for supporting_skill_name in \
  azure-keyvault-reference \
  azure-keyvault-secret \
  technology-radar; do
  supporting_skill_path=""

  if [ -n "$repo_root" ]; then
    case "$supporting_skill_name" in
      azure-keyvault-reference|azure-keyvault-secret)
        candidate_path="$repo_root/plugins/azure/skills/$supporting_skill_name"
        ;;
      technology-radar)
        candidate_path="$repo_root/plugins/standards/skills/technology-radar"
        ;;
    esac

    if [ -f "$candidate_path/SKILL.md" ]; then
      supporting_skill_path=$candidate_path
    fi
  fi

  if [ -z "$supporting_skill_path" ]; then
    supporting_skill_path=$(
      printf '%s' "$skill_list_json" |
        jq -r --arg skill_name "$supporting_skill_name" '
          first(
            .[]
            | select(
                .name == $skill_name
                and .enabled == true
              )
            | .path
          )
          // empty
        '
    )
  fi

  if [ -f "$supporting_skill_path" ]; then
    supporting_skill_path=$(dirname "$supporting_skill_path")
  fi

  if [ -f "$supporting_skill_path/SKILL.md" ]; then
    copy_supporting_skill \
      "$supporting_skill_path" \
      "$current_plugin" \
      "$supporting_skill_name"
    copy_supporting_skill \
      "$supporting_skill_path" \
      "$baseline_plugin" \
      "$supporting_skill_name"
  fi
done

is_knowledge_base() {
  [ -d "$1/apps/website/docs/terraform" ] && [ -d "$1/infra/modules" ]
}

needs_knowledge_base=0
for eval_name in "${selected_evals[@]}"; do
  if [ "$(jq -r --arg eval_name "$eval_name" \
    '.evals[] | select(.name == $eval_name) | .knowledge_base' \
    "$manifest")" = "available" ]; then
    needs_knowledge_base=1
    break
  fi
done

knowledge_base=""
if [ "$needs_knowledge_base" -eq 1 ]; then
  if [ -n "${DX_KB_PATH:-}" ] && is_knowledge_base "$DX_KB_PATH"; then
    knowledge_base=$(cd -- "$DX_KB_PATH" && pwd -P)
  elif [ -n "$repo_root" ] && is_knowledge_base "$repo_root"; then
    knowledge_base=$repo_root
  elif is_knowledge_base "$invocation_cwd"; then
    knowledge_base=$invocation_cwd
  elif is_knowledge_base "${HOME:-}/.dx"; then
    knowledge_base=$(cd -- "${HOME}/.dx" && pwd -P)
  else
    knowledge_base="$runtime_dir/dx-kb"
    git clone --depth 1 --quiet \
      https://github.com/pagopa/dx.git \
      "$knowledge_base"
  fi
fi

knowledge_base_status_before=""
if [ -n "$knowledge_base" ] &&
  git -C "$knowledge_base" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  knowledge_base_status_before="$runtime_dir/kb-status-before.txt"
  git -C "$knowledge_base" status --porcelain=v1 >"$knowledge_base_status_before"
fi

disabled_mcps=()
if mcp_json=$("$copilot_bin" -C "$output_dir" mcp list --json 2>/dev/null); then
  while IFS= read -r mcp_name; do
    disabled_mcps[${#disabled_mcps[@]}]=$mcp_name
  done < <(printf '%s' "$mcp_json" | jq -r '.mcpServers | keys[]')
fi

selected_evals_json=$(
  printf '%s\n' "${selected_evals[@]}" |
    jq -R . |
    jq -s .
)

jq -n \
  --arg created_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --arg current_plugin "$current_plugin" \
  --arg baseline "$baseline_label" \
  --arg knowledge_base "$knowledge_base" \
  --arg model "$main_model" \
  --arg grader_model "$grader_model" \
  --arg effort "$reasoning_effort" \
  --argjson evals "$selected_evals_json" \
  '{
    created_at: $created_at,
    current_plugin: $current_plugin,
    baseline: $baseline,
    knowledge_base: (if $knowledge_base == "" then null else $knowledge_base end),
    model: $model,
    grader_model: $grader_model,
    reasoning_effort: $effort,
    evals: $evals
  }' >"$output_dir/metadata.json"

prepare_workspace() {
  local eval_name=$1
  local workspace=$2
  local fixture_required

  fixture_required=$(
    jq -r --arg eval_name "$eval_name" '
      .evals[]
      | select(.name == $eval_name)
      | .fixture_required
    ' "$manifest"
  )

  if [ "$fixture_required" = "true" ]; then
    "$scaffolder" "$eval_name" "$workspace" >/dev/null
    return
  fi

  mkdir -p -- "$workspace"
  git -C "$workspace" init --quiet
  git -C "$workspace" config user.name "Terraform Skill Evals"
  git -C "$workspace" config user.email "terraform-skill-evals@example.invalid"
  git -C "$workspace" commit --quiet --allow-empty \
    -m "Baseline Terraform eval fixture"
}

build_copilot_command() {
  local workspace=$1
  local plugin_dir=$2
  local log_dir=$3
  local model=$4
  local kb_mode=$5
  local session_mode=$6
  local session_id=$7
  local available_tools=$8

  copilot_command=(
    "$copilot_bin"
    -C "$workspace"
    --allow-all-tools
    --allow-all-urls
    --disable-builtin-mcps
    --no-custom-instructions
    --no-auto-update
    --no-color
    --no-remote
    --no-remote-export
    --plain-diff
    --stream off
    --output-format json
    --log-dir "$log_dir"
    --effort "$reasoning_effort"
    --max-ai-credits "$max_ai_credits"
    --available-tools="$available_tools"
  )

  if [ -n "$model" ]; then
    copilot_command+=(--model "$model")
  fi

  if [ -f "$plugin_dir/skills/terraform-best-practices/SKILL.md" ]; then
    copilot_command+=(--plugin-dir "$plugin_dir")
  fi

  if [ "$kb_mode" = "available" ]; then
    copilot_command+=(--add-dir "$knowledge_base")
  fi

  for mcp_name in "${disabled_mcps[@]}"; do
    copilot_command+=(--disable-mcp-server "$mcp_name")
  done

  if [ "$session_mode" = "new" ]; then
    copilot_command+=(--session-id "$session_id")
  else
    copilot_command+=(--resume="$session_id")
  fi
}

run_copilot_turn() {
  local workspace=$1
  local plugin_dir=$2
  local log_dir=$3
  local model=$4
  local kb_mode=$5
  local session_mode=$6
  local session_id=$7
  local prompt=$8
  local events_file=$9
  local stderr_file=${10}
  local telemetry_file=${11}
  local available_tools=${12}
  local exit_code

  build_copilot_command \
    "$workspace" \
    "$plugin_dir" \
    "$log_dir" \
    "$model" \
    "$kb_mode" \
    "$session_mode" \
    "$session_id" \
    "$available_tools"

  set +e
  if [ "$kb_mode" = "available" ]; then
    DX_KB_PATH="$knowledge_base" \
      COPILOT_OTEL_FILE_EXPORTER_PATH="$telemetry_file" \
      COPILOT_OTEL_SOURCE_NAME="terraform-best-practices-evals" \
      "${copilot_command[@]}" -p "$prompt" \
      >"$events_file" 2>"$stderr_file"
    exit_code=$?
  else
    (
      unset DX_KB_PATH
      COPILOT_OTEL_FILE_EXPORTER_PATH="$telemetry_file" \
        COPILOT_OTEL_SOURCE_NAME="terraform-best-practices-evals" \
        "${copilot_command[@]}" -p "$prompt"
    ) >"$events_file" 2>"$stderr_file"
    exit_code=$?
  fi
  set -e

  return "$exit_code"
}

extract_response() {
  jq -rs '
    [
      .[]
      | select(
          .type == "assistant.message"
          and (.data.toolRequests | length == 0)
          and (.data.content | length > 0)
        )
      | .data.content
    ]
    | last
    // ""
  ' "$1"
}

write_metrics() {
  local telemetry_file=$1
  local metrics_file=$2

  if [ ! -s "$telemetry_file" ]; then
    jq -n '{
      input_tokens: 0,
      output_tokens: 0,
      duration_ms: 0,
      ai_credits: 0,
      models: []
    }' >"$metrics_file"
    return
  fi

  jq -s '
    [
      .[]
      | select(
          .type == "span"
          and (.name | startswith("chat "))
        )
    ] as $calls
    | {
        input_tokens: (
          [$calls[].attributes["gen_ai.usage.input_tokens"] // 0]
          | add
          // 0
        ),
        output_tokens: (
          [$calls[].attributes["gen_ai.usage.output_tokens"] // 0]
          | add
          // 0
        ),
        duration_ms: (
          [$calls[].attributes["github.copilot.server_duration"] // 0]
          | add
          // 0
        ),
        ai_credits: (
          [$calls[].attributes["github.copilot.cost"] // 0]
          | add
          // 0
        ),
        models: (
          [$calls[].attributes["gen_ai.response.model"] // empty]
          | unique
        )
      }
  ' "$telemetry_file" >"$metrics_file"
}

cleanup_terraform_cache() {
  local workspace=$1

  while IFS= read -r terraform_dir; do
    rm -rf -- "$terraform_dir"
  done < <(find "$workspace" -type d -name .terraform -prune -print)
}

run_variant() {
  local eval_name=$1
  local variant_name=$2
  local plugin_dir=$3
  local variant_dir=$4
  local workspace="$variant_dir/workspace"
  local kb_mode
  local prompt
  local original_prompt
  local follow_up
  local session_id
  local first_exit_code=0
  local follow_up_exit_code=0
  local has_follow_up=0
  local diff_check=true
  local terraform_fmt=null
  local placeholders=false
  local skill_loaded=false
  local skill_invoked=false

  mkdir -p -- "$variant_dir/logs"
  prepare_workspace "$eval_name" "$workspace"

  kb_mode=$(
    jq -r --arg eval_name "$eval_name" '
      .evals[]
      | select(.name == $eval_name)
      | .knowledge_base
    ' "$manifest"
  )
  original_prompt=$(
    jq -r --arg eval_name "$eval_name" '
      .evals[]
      | select(.name == $eval_name)
      | .prompt
    ' "$manifest"
  )
  follow_up=$(
    jq -r --arg eval_name "$eval_name" '
      .evals[]
      | select(.name == $eval_name)
      | .follow_up // empty
    ' "$manifest"
  )

  if [ -n "$plugin_dir" ]; then
    prompt=$(printf \
      'Invoke the terraform-best-practices skill before acting.\n\n%s' \
      "$original_prompt")
  else
    prompt=$original_prompt
  fi

  session_id=$(new_session_id)

  if run_copilot_turn \
    "$workspace" \
    "$plugin_dir" \
    "$variant_dir/logs" \
    "$main_model" \
    "$kb_mode" \
    "new" \
    "$session_id" \
    "$prompt" \
    "$variant_dir/turn-1.events.jsonl" \
    "$variant_dir/turn-1.stderr.log" \
    "$variant_dir/telemetry.jsonl" \
    "$main_tools"; then
    first_exit_code=0
  else
    first_exit_code=$?
  fi
  extract_response "$variant_dir/turn-1.events.jsonl" \
    >"$variant_dir/turn-1.response.md"

  if [ -n "$follow_up" ] && [ "$first_exit_code" -eq 0 ]; then
    has_follow_up=1
    if run_copilot_turn \
      "$workspace" \
      "$plugin_dir" \
      "$variant_dir/logs" \
      "$main_model" \
      "$kb_mode" \
      "resume" \
      "$session_id" \
      "$follow_up" \
      "$variant_dir/turn-2.events.jsonl" \
      "$variant_dir/turn-2.stderr.log" \
      "$variant_dir/telemetry.jsonl" \
      "$main_tools"; then
      follow_up_exit_code=0
    else
      follow_up_exit_code=$?
    fi
    extract_response "$variant_dir/turn-2.events.jsonl" \
      >"$variant_dir/turn-2.response.md"
  fi

  {
    printf '# Turn 1\n\n'
    cat "$variant_dir/turn-1.response.md"
    if [ "$has_follow_up" -eq 1 ]; then
      printf '\n\n# Scripted Follow-up\n\n%s\n\n# Turn 2\n\n' "$follow_up"
      cat "$variant_dir/turn-2.response.md"
    fi
    printf '\n'
  } >"$variant_dir/combined-response.md"

  local event_files
  event_files=("$variant_dir"/turn-*.events.jsonl)
  jq -s '
    [
      .[]
      | select(.type == "assistant.message")
      | .data.toolRequests[]?
    ]
  ' "${event_files[@]}" >"$variant_dir/tool-requests.json"
  jq -s '
    [
      .[]
      | select(.type == "session.skills_loaded")
      | .data.skills[]
    ]
    | unique_by(.name, .path)
  ' "${event_files[@]}" >"$variant_dir/skills.json"
  jq -s '
    [
      .[]
      | select(.type == "result")
    ]
    | last
    // {}
  ' "${event_files[@]}" >"$variant_dir/result.json"

  write_metrics "$variant_dir/telemetry.jsonl" "$variant_dir/metrics.json"

  git -C "$workspace" add -N . >/dev/null 2>&1 || true
  git -C "$workspace" diff --binary >"$variant_dir/diff.patch"
  git -C "$workspace" diff --stat >"$variant_dir/diff-stat.txt"
  git -C "$workspace" status --short >"$variant_dir/status.txt"

  if ! git -C "$workspace" diff --check \
    >"$variant_dir/diff-check.txt" 2>&1; then
    diff_check=false
  fi

  if command -v terraform >/dev/null 2>&1 && [ -d "$workspace/infra" ]; then
    if terraform fmt -check -recursive "$workspace/infra" \
      >"$variant_dir/terraform-fmt.txt" 2>&1; then
      terraform_fmt=true
    else
      terraform_fmt=false
    fi
  fi

  if grep -E '^\+[^+].*(TODO|FIXME|<[^>]+>)' \
    "$variant_dir/diff.patch" >/dev/null 2>&1; then
    placeholders=true
  fi

  if jq -e '
    any(.[];
      .name == "terraform-best-practices"
      and .source == "plugin"
    )
  ' "$variant_dir/skills.json" >/dev/null; then
    skill_loaded=true
  fi

  if jq -e '
    any(.[];
      .name == "skill"
      and (
        (.arguments_json // .arguments // "")
        | tostring
        | contains("terraform-best-practices")
      )
    )
  ' "$variant_dir/tool-requests.json" >/dev/null; then
    skill_invoked=true
  fi

  jq -n \
    --arg eval_name "$eval_name" \
    --arg variant "$variant_name" \
    --arg session_id "$session_id" \
    --argjson first_exit_code "$first_exit_code" \
    --argjson follow_up_exit_code "$follow_up_exit_code" \
    --argjson has_follow_up "$has_follow_up" \
    '{
      eval_name: $eval_name,
      variant: $variant,
      session_id: $session_id,
      first_exit_code: $first_exit_code,
      follow_up_exit_code: $follow_up_exit_code,
      has_follow_up: ($has_follow_up == 1),
      success: (
        $first_exit_code == 0
        and (
          $has_follow_up == 0
          or $follow_up_exit_code == 0
        )
      )
    }' >"$variant_dir/execution.json"

  jq -n \
    --argjson diff_check "$diff_check" \
    --argjson terraform_fmt "$terraform_fmt" \
    --argjson placeholders "$placeholders" \
    --argjson skill_loaded "$skill_loaded" \
    --argjson skill_invoked "$skill_invoked" \
    --slurpfile execution "$variant_dir/execution.json" \
    '{
      execution_success: $execution[0].success,
      diff_check: $diff_check,
      terraform_fmt: $terraform_fmt,
      added_placeholders: $placeholders,
      skill_loaded: $skill_loaded,
      skill_invoked: $skill_invoked
    }' >"$variant_dir/mechanical.json"

  cleanup_terraform_cache "$workspace"
}

normalise_grade() {
  local raw_grade=$1
  local grade_file=$2
  local grade_input=$3
  local assertion_count
  local expected_assertions
  local expected_eval
  local cleaned_grade

  assertion_count=$(jq '.assertions | length' "$grade_input")
  expected_assertions=$(jq -c '.assertions | sort' "$grade_input")
  expected_eval=$(jq -r '.eval_name' "$grade_input")
  cleaned_grade=$(sed \
    -e '/^[[:space:]]*```json[[:space:]]*$/d' \
    -e '/^[[:space:]]*```[[:space:]]*$/d' \
    "$raw_grade")

  if printf '%s\n' "$cleaned_grade" |
    jq -e \
      --argjson assertion_count "$assertion_count" \
      --argjson expected_assertions "$expected_assertions" \
      --arg expected_eval "$expected_eval" '
        .eval_name == $expected_eval
        and (.current.pass | type == "boolean")
        and (.baseline.pass | type == "boolean")
        and (.comparison.winner | IN("current", "baseline", "tie"))
        and (.current.rubric | type == "array" and length > 0)
        and (.baseline.rubric | type == "array" and length > 0)
        and all(.current.assertions[];
          (.passed | type == "boolean")
          and (.evidence | type == "string" and length > 0)
        )
        and all(.baseline.assertions[];
          (.passed | type == "boolean")
          and (.evidence | type == "string" and length > 0)
        )
        and all(.current.gates[]; type == "boolean")
        and all(.baseline.gates[]; type == "boolean")
        and (.current.assertions | length == $assertion_count)
        and (.baseline.assertions | length == $assertion_count)
        and (
          [.current.assertions[].assertion] | sort
        ) == $expected_assertions
        and (
          [.baseline.assertions[].assertion] | sort
        ) == $expected_assertions
      ' >/dev/null 2>&1; then
    printf '%s\n' "$cleaned_grade" | jq . >"$grade_file"
    return 0
  fi

  return 1
}

enforce_execution_constraints() {
  local grade_file=$1
  local eval_dir=$2
  local constrained_grade

  constrained_grade=$(mktemp)
  jq \
    --slurpfile current_execution "$eval_dir/current/execution.json" \
    --slurpfile current_mechanical "$eval_dir/current/mechanical.json" \
    --slurpfile baseline_execution "$eval_dir/baseline/execution.json" '
      (
        $current_execution[0].success
        and $current_mechanical[0].skill_loaded
        and $current_mechanical[0].skill_invoked
      ) as $current_execution_ok
      | $baseline_execution[0].success as $baseline_execution_ok
      | .current.pass = (
          .current.pass
          and $current_execution_ok
        )
      | .baseline.pass = (
          .baseline.pass
          and $baseline_execution_ok
        )
      | if $current_execution_ok then
          .
        else
          .current.summary += " Runner constraint failed: current execution must succeed and invoke the skill."
        end
      | if $baseline_execution_ok then
          .
        else
          .baseline.summary += " Runner constraint failed: baseline execution did not complete."
        end
    ' "$grade_file" >"$constrained_grade"
  mv -- "$constrained_grade" "$grade_file"
}

run_grader() {
  local eval_name=$1
  local eval_dir=$2
  local grade_dir="$eval_dir/grading"
  local session_id
  local grader_prompt
  local packet_size
  local variant_name
  local artifact_name
  local artifact_path
  local grader_exit_code=0
  local retry_exit_code=0

  mkdir -p -- "$grade_dir/logs"
  cp -- "$rubric" "$eval_dir/rubric.md"
  cp -- "$grader_instructions" "$eval_dir/grader-instructions.md"

  jq \
    --arg eval_name "$eval_name" \
    --arg baseline "$baseline_label" '
      .evals[]
      | select(.name == $eval_name)
      | {
          eval_name: .name,
          prompt,
          follow_up: (.follow_up // null),
          expected_output,
          assertions,
          baseline: $baseline,
          artifacts: {
            current: {
              response: "current/combined-response.md",
              diff: "current/diff.patch",
              tools: "current/tool-requests.json",
              mechanical: "current/mechanical.json",
              metrics: "current/metrics.json",
              execution: "current/execution.json"
            },
            baseline: {
              response: "baseline/combined-response.md",
              diff: "baseline/diff.patch",
              tools: "baseline/tool-requests.json",
              mechanical: "baseline/mechanical.json",
              metrics: "baseline/metrics.json",
              execution: "baseline/execution.json"
            }
          }
        }
    ' "$manifest" >"$eval_dir/grade-input.json"

  {
    printf '<grader-instructions path="grader-instructions.md">\n'
    cat "$eval_dir/grader-instructions.md"
    printf '\n</grader-instructions>\n\n'

    printf '<grade-input path="grade-input.json">\n'
    cat "$eval_dir/grade-input.json"
    printf '\n</grade-input>\n\n'

    printf '<rubric path="rubric.md">\n'
    cat "$eval_dir/rubric.md"
    printf '\n</rubric>\n\n'

    for variant_name in current baseline; do
      for artifact_name in \
        combined-response.md \
        diff.patch \
        tool-requests.json \
        mechanical.json \
        metrics.json \
        execution.json; do
        artifact_path="$variant_name/$artifact_name"
        printf '<artifact path="%s">\n' "$artifact_path"
        cat "$eval_dir/$artifact_path"
        printf '\n</artifact>\n\n'
      done
    done
  } >"$grade_dir/grading-packet.md"

  packet_size=$(wc -c <"$grade_dir/grading-packet.md" | tr -d ' ')
  if [ "$packet_size" -le 180000 ]; then
    grader_prompt=$(
      printf 'Do not call tools. Grade the complete packet below and return only the required JSON.\n\n'
      cat "$grade_dir/grading-packet.md"
    )
  else
    grader_prompt=$(
      printf '%s' \
        'Read grading/grading-packet.md, follow its instructions, and return only the required JSON.'
    )
  fi
  session_id=$(new_session_id)

  if run_copilot_turn \
    "$eval_dir" \
    "" \
    "$grade_dir/logs" \
    "$grader_model" \
    "unavailable" \
    "new" \
    "$session_id" \
    "$grader_prompt" \
    "$grade_dir/turn-1.events.jsonl" \
    "$grade_dir/turn-1.stderr.log" \
    "$grade_dir/telemetry.jsonl" \
    "$grader_tools"; then
    grader_exit_code=0
  else
    grader_exit_code=$?
  fi
  extract_response "$grade_dir/turn-1.events.jsonl" \
    >"$grade_dir/turn-1.response.txt"

  if [ "$grader_exit_code" -eq 0 ] &&
    normalise_grade \
      "$grade_dir/turn-1.response.txt" \
      "$eval_dir/grade.json" \
      "$eval_dir/grade-input.json"; then
    enforce_execution_constraints "$eval_dir/grade.json" "$eval_dir"
    write_metrics "$grade_dir/telemetry.jsonl" "$grade_dir/metrics.json"
    return
  fi

  if run_copilot_turn \
    "$eval_dir" \
    "" \
    "$grade_dir/logs" \
    "$grader_model" \
    "unavailable" \
    "resume" \
    "$session_id" \
    "The previous answer was invalid. Return only one JSON object matching grader-instructions.md exactly." \
    "$grade_dir/turn-2.events.jsonl" \
    "$grade_dir/turn-2.stderr.log" \
    "$grade_dir/telemetry.jsonl" \
    "$grader_tools"; then
    retry_exit_code=0
  else
    retry_exit_code=$?
  fi
  extract_response "$grade_dir/turn-2.events.jsonl" \
    >"$grade_dir/turn-2.response.txt"

  if [ "$retry_exit_code" -eq 0 ] &&
    normalise_grade \
      "$grade_dir/turn-2.response.txt" \
      "$eval_dir/grade.json" \
      "$eval_dir/grade-input.json"; then
    enforce_execution_constraints "$eval_dir/grade.json" "$eval_dir"
    write_metrics "$grade_dir/telemetry.jsonl" "$grade_dir/metrics.json"
    return
  fi

  jq -n \
    --arg eval_name "$eval_name" \
    '{
      eval_name: $eval_name,
      grading_error: "The automated grader did not return valid JSON.",
      current: {
        assertions: [],
        rubric: [],
        gates: {},
        pass: false,
        summary: "Automated grading failed."
      },
      baseline: {
        assertions: [],
        rubric: [],
        gates: {},
        pass: false,
        summary: "Automated grading failed."
      },
      comparison: {
        winner: "tie",
        material_differences: [],
        regressions: []
      }
    }' >"$eval_dir/grade.json"
  write_metrics "$grade_dir/telemetry.jsonl" "$grade_dir/metrics.json"
}

if [ "$dry_run" -eq 1 ]; then
  for eval_name in "${selected_evals[@]}"; do
    eval_dir="$output_dir/$eval_name"
    prepare_workspace "$eval_name" "$eval_dir/current/workspace"
    prepare_workspace "$eval_name" "$eval_dir/baseline/workspace"
  done
  printf 'Prepared %s eval workspaces at %s\n' \
    "${#selected_evals[@]}" \
    "$output_dir"
  exit 0
fi

rows_file="$output_dir/rows.jsonl"
: >"$rows_file"

for eval_name in "${selected_evals[@]}"; do
  printf 'Running %s\n' "$eval_name"
  eval_dir="$output_dir/$eval_name"
  mkdir -p -- "$eval_dir"

  run_variant \
    "$eval_name" \
    "current" \
    "$current_plugin" \
    "$eval_dir/current"
  run_variant \
    "$eval_name" \
    "baseline" \
    "$baseline_plugin" \
    "$eval_dir/baseline"
  run_grader "$eval_name" "$eval_dir"

  jq -n \
    --arg eval_name "$eval_name" \
    --slurpfile grade "$eval_dir/grade.json" \
    --slurpfile current_metrics "$eval_dir/current/metrics.json" \
    --slurpfile baseline_metrics "$eval_dir/baseline/metrics.json" \
    --slurpfile grader_metrics "$eval_dir/grading/metrics.json" \
    '{
      eval_name: $eval_name,
      current: {
        pass: $grade[0].current.pass,
        assertions: $grade[0].current.assertions,
        summary: $grade[0].current.summary,
        metrics: $current_metrics[0]
      },
      baseline: {
        pass: $grade[0].baseline.pass,
        assertions: $grade[0].baseline.assertions,
        summary: $grade[0].baseline.summary,
        metrics: $baseline_metrics[0]
      },
      comparison: $grade[0].comparison,
      grading_error: ($grade[0].grading_error // null),
      grader_metrics: $grader_metrics[0]
    }' >>"$rows_file"
done

jq -s '
  . as $evals
  | {
      evals: $evals,
      totals: {
        eval_count: ($evals | length),
        current_passes: (
          [$evals[] | select(.current.pass)] | length
        ),
        baseline_passes: (
          [$evals[] | select(.baseline.pass)] | length
        ),
        current_input_tokens: (
          [$evals[].current.metrics.input_tokens] | add // 0
        ),
        current_output_tokens: (
          [$evals[].current.metrics.output_tokens] | add // 0
        ),
        baseline_input_tokens: (
          [$evals[].baseline.metrics.input_tokens] | add // 0
        ),
        baseline_output_tokens: (
          [$evals[].baseline.metrics.output_tokens] | add // 0
        ),
        current_duration_ms: (
          [$evals[].current.metrics.duration_ms] | add // 0
        ),
        baseline_duration_ms: (
          [$evals[].baseline.metrics.duration_ms] | add // 0
        ),
        current_ai_credits: (
          [$evals[].current.metrics.ai_credits] | add // 0
        ),
        baseline_ai_credits: (
          [$evals[].baseline.metrics.ai_credits] | add // 0
        ),
        grader_input_tokens: (
          [$evals[].grader_metrics.input_tokens] | add // 0
        ),
        grader_output_tokens: (
          [$evals[].grader_metrics.output_tokens] | add // 0
        ),
        grading_errors: (
          [$evals[] | select(.grading_error != null)] | length
        )
      },
      failed_guardrails: (
        [
          $evals[]
          | .current.assertions[]?
          | select(.passed == false)
          | .assertion
          | scan("TF-G[0-9]{2}")
        ]
        | group_by(.)
        | map({
            guardrail: .[0],
            failures: length
          })
        | sort_by(-.failures, .guardrail)
      )
    }
' "$rows_file" >"$output_dir/summary.json"

{
  printf '# Terraform Skill Eval Report\n\n'
  printf "Baseline: \`%s\`\n\n" "$baseline_label"
  printf '| Eval | Current | Baseline | Winner | Current tokens | Baseline tokens |\n'
  printf '| --- | --- | --- | --- | ---: | ---: |\n'
  jq -r '
    .evals[]
    | [
        .eval_name,
        (if .current.pass then "pass" else "fail" end),
        (if .baseline.pass then "pass" else "fail" end),
        .comparison.winner,
        (
          .current.metrics.input_tokens
          + .current.metrics.output_tokens
          | tostring
        ),
        (
          .baseline.metrics.input_tokens
          + .baseline.metrics.output_tokens
          | tostring
        )
      ]
    | "| " + join(" | ") + " |"
  ' "$output_dir/summary.json"

  printf '\n## Totals\n\n'
  jq -r '
    .totals
    | "- Current: \(.current_passes)/\(.eval_count) passed, \(.current_input_tokens + .current_output_tokens) tokens, \(.current_duration_ms) ms model time, \(.current_ai_credits) AI credits.\n"
      + "- Baseline: \(.baseline_passes)/\(.eval_count) passed, \(.baseline_input_tokens + .baseline_output_tokens) tokens, \(.baseline_duration_ms) ms model time, \(.baseline_ai_credits) AI credits.\n"
      + "- Grader: \(.grader_input_tokens + .grader_output_tokens) tokens.\n"
      + "- Grading errors: \(.grading_errors).\n"
  ' "$output_dir/summary.json"

  if [ "$(jq '.failed_guardrails | length' "$output_dir/summary.json")" -gt 0 ]; then
    printf '\n## Recurring Current Failures\n\n'
    jq -r '
      .failed_guardrails[]
      | "- `\(.guardrail)`: \(.failures) failed assertions"
    ' "$output_dir/summary.json"
  fi
} >"$output_dir/summary.md"

if [ -n "$knowledge_base_status_before" ]; then
  git -C "$knowledge_base" status --porcelain=v1 \
    >"$runtime_dir/kb-status-after.txt"
  if ! cmp -s \
    "$knowledge_base_status_before" \
    "$runtime_dir/kb-status-after.txt"; then
    printf 'The DX knowledge base changed during eval execution.\n' >&2
    exit 1
  fi
fi

printf 'Eval report: %s\n' "$output_dir/summary.md"

if ! jq -e '
  .totals.current_passes == .totals.eval_count
  and .totals.grading_errors == 0
' "$output_dir/summary.json" >/dev/null; then
  exit 1
fi
