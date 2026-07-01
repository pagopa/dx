#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ] || [ "$(set -o 2>/dev/null | sed -n 's/^posix[[:space:]]*//p')" = "on" ]; then
  if command -v bash >/dev/null 2>&1; then
    exec bash "$0" "$@"
  fi

  echo "ERROR: bash is required to run $(basename "$0")." >&2
  exit 1
fi

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
DEFAULT_BRANCH_NAME="chore/remove-generated-terraform-docs"
DEFAULT_WORK_DIR="${TERRAFORM_DOCS_CLEANUP_WORK_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/dx/terraform-docs-cleanup}"
DEFAULT_COMMIT_MESSAGE="Remove generated Terraform docs from infrastructure"
PR_TITLE="Remove generated Terraform docs from infrastructure"

DRY_RUN=0
WORK_DIR="$DEFAULT_WORK_DIR"
BRANCH_NAME="${TERRAFORM_DOCS_CLEANUP_BRANCH:-$DEFAULT_BRANCH_NAME}"
BASE_BRANCH_OVERRIDE=""

usage() {
  cat <<EOF
Usage:
  $SCRIPT_NAME [--dry-run] [--work-dir <path>] [--branch-name <name>] [--base-branch <name>] <owner/repo>...

Removes terraform_docs pre-commit hooks and generated Terraform docs README
sections from customer infrastructure repositories.

Options:
  --dry-run             Prepare local branches and commits, but skip push and PR creation.
  --work-dir <path>     Reusable clone directory. Defaults to $DEFAULT_WORK_DIR.
  --branch-name <name>  Branch to create or reuse. Defaults to $DEFAULT_BRANCH_NAME.
  --base-branch <name>  Override repository default branch detection.
  -h, --help            Show this help message.
EOF
}

info() {
  echo "INFO: $*" >&2
}

warn() {
  echo "WARN: $*" >&2
}

error() {
  echo "ERROR: $*" >&2
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    error "Required command not found: $command_name"
    return 1
  fi
}

is_existing_local_path() {
  local repository="$1"

  [[ -e "$repository" ]]
}

is_github_repository_slug() {
  local repository="$1"

  [[ "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]
}

safe_repo_dir_name() {
  local repository="$1"

  printf "%s" "$repository" | sed -E 's#^[./]+##; s#[^A-Za-z0-9._-]+#_#g'
}

clone_or_reuse_repository() {
  local repository="$1"
  local repository_dir="$2"

  if [[ -d "$repository_dir/.git" ]]; then
    info "Reusing $repository_dir"
    return 0
  fi

  mkdir -p "$(dirname "$repository_dir")"

  if is_existing_local_path "$repository"; then
    info "Cloning local repository $repository"
    git clone "$repository" "$repository_dir" --quiet
    return 0
  fi

  if ! is_github_repository_slug "$repository"; then
    error "Repository must be an owner/repo slug or an existing local path: $repository"
    return 1
  fi

  require_command gh
  info "Cloning GitHub repository $repository"
  gh repo clone "$repository" "$repository_dir" -- --quiet
}

ensure_clean_worktree() {
  local repository_dir="$1"
  local status

  status="$(git -C "$repository_dir" status --porcelain)"
  if [[ -n "$status" ]]; then
    error "$repository_dir has uncommitted changes. Commit, stash, or remove them before rerunning."
    return 1
  fi
}

detect_base_branch() {
  local repository="$1"
  local repository_dir="$2"
  local origin_head
  local remote_head
  local current_branch

  if [[ -n "$BASE_BRANCH_OVERRIDE" ]]; then
    printf "%s\n" "$BASE_BRANCH_OVERRIDE"
    return 0
  fi

  if ! is_existing_local_path "$repository" && is_github_repository_slug "$repository"; then
    gh repo view "$repository" --json defaultBranchRef --jq ".defaultBranchRef.name"
    return 0
  fi

  origin_head="$(git -C "$repository_dir" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$origin_head" ]]; then
    printf "%s\n" "${origin_head#origin/}"
    return 0
  fi

  remote_head="$(git -C "$repository_dir" remote show origin 2>/dev/null | sed -n 's/.*HEAD branch: //p' | head -n 1)"
  if [[ -n "$remote_head" ]]; then
    printf "%s\n" "$remote_head"
    return 0
  fi

  current_branch="$(git -C "$repository_dir" branch --show-current)"
  if [[ -n "$current_branch" ]]; then
    printf "%s\n" "$current_branch"
    return 0
  fi

  error "Unable to detect the base branch for $repository"
  return 1
}

prepare_branch() {
  local repository_dir="$1"
  local base_branch="$2"
  local base_ref="origin/$base_branch"

  git -C "$repository_dir" fetch origin --quiet

  if git -C "$repository_dir" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    git -C "$repository_dir" checkout "$BRANCH_NAME" --quiet
    return 0
  fi

  if git -C "$repository_dir" show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    git -C "$repository_dir" checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME" --quiet
    return 0
  fi

  if ! git -C "$repository_dir" rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    base_ref="$base_branch"
  fi

  git -C "$repository_dir" checkout -b "$BRANCH_NAME" "$base_ref" --quiet
}

resolve_base_ref() {
  local base_branch="$1"

  if git rev-parse --verify "origin/$base_branch" >/dev/null 2>&1; then
    printf "%s\n" "origin/$base_branch"
    return 0
  fi

  printf "%s\n" "$base_branch"
}

cleanup_pre_commit_config() {
  local file_path="${1:-.pre-commit-config.yaml}"
  local temp_file

  if [[ ! -f "$file_path" ]]; then
    error "Missing root pre-commit configuration: $file_path"
    return 2
  fi

  temp_file="$(mktemp)"

  awk '
    function indent_len(line, stripped) {
      stripped = line
      sub(/^[ \t]*/, "", stripped)
      return length(line) - length(stripped)
    }

    function is_repo_start(line, stripped) {
      stripped = line
      sub(/^[ \t]*/, "", stripped)
      return indent_len(line) == 2 && stripped ~ /^-[ \t]*repo:/
    }

    function is_tf_docs_hook(line, stripped) {
      stripped = line
      sub(/^[ \t]*/, "", stripped)
      return stripped ~ /^-[ \t]*id:[ \t]*["'\'']?terraform_docs["'\'']?[ \t]*$/
    }

    function is_hook_id(line, stripped) {
      stripped = line
      sub(/^[ \t]*/, "", stripped)
      return stripped ~ /^-[ \t]*id:[ \t]*/
    }

    function flush_block(   i, line, current_indent, skip, skip_indent, out_count, hook_count, removed_in_block) {
      if (block_count == 0) {
        return
      }

      skip = 0
      skip_indent = -1
      out_count = 0
      hook_count = 0
      removed_in_block = 0
      delete out

      for (i = 1; i <= block_count; i++) {
        line = block[i]
        current_indent = indent_len(line)

        if (skip) {
          if (line !~ /^[ \t]*$/ && current_indent <= skip_indent) {
            skip = 0
          } else {
            continue
          }
        }

        if (is_tf_docs_hook(line)) {
          skip = 1
          skip_indent = current_indent
          removed_in_block = 1
          changed = 1
          continue
        }

        out_count++
        out[out_count] = line

        if (is_hook_id(line)) {
          hook_count++
        }
      }

      if (removed_in_block && hook_count == 0) {
        delete block
        block_count = 0
        return
      }

      for (i = 1; i <= out_count; i++) {
        print out[i]
      }

      delete block
      block_count = 0
    }

    {
      if (is_repo_start($0)) {
        flush_block()
      }

      if (block_count > 0 || is_repo_start($0)) {
        block_count++
        block[block_count] = $0
      } else {
        print
      }
    }

    END {
      flush_block()
    }
  ' "$file_path" >"$temp_file"

  if cmp -s "$file_path" "$temp_file"; then
    rm -f "$temp_file"
    return 1
  fi

  mv "$temp_file" "$file_path"
  return 0
}

remove_tf_docs_from_readme() {
  local file_path="$1"
  local temp_file
  local awk_status

  temp_file="$(mktemp)"

  if awk '
    /<!-- BEGIN_TF_DOCS -->/ {
      skip = 1
      removed = 1
      next
    }

    /<!-- END_TF_DOCS -->/ && skip {
      skip = 0
      next
    }

    !skip {
      print
    }

    END {
      if (skip) {
        exit 2
      }
      if (!removed) {
        exit 3
      }
    }
  ' "$file_path" >"$temp_file"; then
    awk_status=0
  else
    awk_status=$?
  fi

  if [[ "$awk_status" -eq 2 ]]; then
    rm -f "$temp_file"
    error "Unclosed Terraform docs block in $file_path"
    return 2
  fi

  if [[ "$awk_status" -ne 0 ]]; then
    rm -f "$temp_file"
    return 1
  fi

  if cmp -s "$file_path" "$temp_file"; then
    rm -f "$temp_file"
    return 1
  fi

  mv "$temp_file" "$file_path"
  return 0
}

has_meaningful_readme_content() {
  local file_path="$1"

  awk '
    /^[[:space:]]*$/ {
      next
    }

    /^[[:space:]]*#{1,6}[[:space:]]+/ {
      next
    }

    /^[[:space:]]*[=-]+[[:space:]]*$/ {
      next
    }

    {
      found = 1
      exit
    }

    END {
      exit found ? 0 : 1
    }
  ' "$file_path"
}

cleanup_readmes() {
  local changed_count=0
  local deleted_count=0
  local readme
  local cleanup_status

  if [[ ! -d infra ]]; then
    warn "No infra directory found; skipping README cleanup."
    return 1
  fi

  while IFS= read -r -d "" readme; do
    if remove_tf_docs_from_readme "$readme"; then
      if has_meaningful_readme_content "$readme"; then
        changed_count=$((changed_count + 1))
      else
        rm -f "$readme"
        deleted_count=$((deleted_count + 1))
      fi
    else
      cleanup_status=$?
      if [[ "$cleanup_status" -eq 2 ]]; then
        return 2
      fi
    fi
  done < <(find infra -type f -name README.md -print0)

  if [[ "$changed_count" -gt 0 || "$deleted_count" -gt 0 ]]; then
    info "README cleanup: changed=$changed_count deleted=$deleted_count"
    return 0
  fi

  return 1
}

stage_cleanup_changes() {
  if [[ -f .pre-commit-config.yaml ]]; then
    git add -A .pre-commit-config.yaml
  fi

  if [[ -d infra ]]; then
    git add -A infra
  fi
}

branch_ahead_count() {
  local base_ref="$1"

  git rev-list --count "$base_ref..HEAD" 2>/dev/null || printf "0\n"
}

has_staged_changes() {
  ! git diff --cached --quiet
}

commit_staged_changes() {
  git commit -m "$DEFAULT_COMMIT_MESSAGE" --quiet
}

pull_request_body() {
  cat <<'EOF'
## Summary

This PR removes generated Terraform docs from infrastructure repositories where README files are not useful documentation.

## Changes

- Remove `terraform_docs` from the root pre-commit configuration.
- Remove generated `<!-- BEGIN_TF_DOCS -->...<!-- END_TF_DOCS -->` blocks from `infra/**/README.md`.
- Delete README files that contained only generated Terraform docs or only a heading plus generated Terraform docs.
EOF
}

push_and_open_pr() {
  local repository="$1"
  local base_branch="$2"
  local existing_pr_url

  if is_existing_local_path "$repository"; then
    error "Cannot open a pull request for a local path. Re-run with a GitHub owner/repo slug."
    return 1
  fi

  git push -u origin "$BRANCH_NAME" --quiet

  if existing_pr_url="$(gh pr view --repo "$repository" --head "$BRANCH_NAME" --json url --jq ".url" 2>/dev/null)"; then
    info "Pull request already exists: $existing_pr_url"
    return 0
  fi

  gh pr create \
    --repo "$repository" \
    --base "$base_branch" \
    --head "$BRANCH_NAME" \
    --title "$PR_TITLE" \
    --body "$(pull_request_body)"
}

process_repository() {
  local repository="$1"
  local repository_dir="$WORK_DIR/$(safe_repo_dir_name "$repository")"
  local base_branch
  local base_ref
  local ahead_count
  local pre_commit_status=1
  local readme_status=1

  info "Processing $repository"

  clone_or_reuse_repository "$repository" "$repository_dir"
  ensure_clean_worktree "$repository_dir"

  base_branch="$(detect_base_branch "$repository" "$repository_dir")"
  prepare_branch "$repository_dir" "$base_branch"

  pushd "$repository_dir" >/dev/null

  base_ref="$(resolve_base_ref "$base_branch")"

  if cleanup_pre_commit_config ".pre-commit-config.yaml"; then
    pre_commit_status=0
  else
    pre_commit_status=$?
    if [[ "$pre_commit_status" -eq 2 ]]; then
      popd >/dev/null
      return 1
    fi
  fi

  if cleanup_readmes; then
    readme_status=0
  else
    readme_status=$?
    if [[ "$readme_status" -eq 2 ]]; then
      popd >/dev/null
      return 1
    fi
  fi

  stage_cleanup_changes

  if has_staged_changes; then
    commit_staged_changes
    info "Created cleanup commit on $BRANCH_NAME"
  else
    ahead_count="$(branch_ahead_count "$base_ref")"
    if [[ "$ahead_count" -eq 0 ]]; then
      info "No cleanup changes needed for $repository"
      popd >/dev/null
      return 0
    fi
    info "Reusing prepared branch $BRANCH_NAME with $ahead_count commit(s) ahead of $base_ref"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    info "Dry-run: prepared $repository_dir on branch $BRANCH_NAME; skipping push and PR creation."
    popd >/dev/null
    return 0
  fi

  if ! push_and_open_pr "$repository" "$base_branch"; then
    popd >/dev/null
    return 1
  fi

  popd >/dev/null
}

parse_args() {
  REPOSITORIES=()

  while [[ "$#" -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        ;;
      --work-dir)
        if [[ "$#" -lt 2 ]]; then
          error "--work-dir requires a value"
          return 1
        fi
        WORK_DIR="$2"
        shift
        ;;
      --branch-name)
        if [[ "$#" -lt 2 ]]; then
          error "--branch-name requires a value"
          return 1
        fi
        BRANCH_NAME="$2"
        shift
        ;;
      --base-branch)
        if [[ "$#" -lt 2 ]]; then
          error "--base-branch requires a value"
          return 1
        fi
        BASE_BRANCH_OVERRIDE="$2"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      --)
        shift
        while [[ "$#" -gt 0 ]]; do
          REPOSITORIES+=("$1")
          shift
        done
        return 0
        ;;
      -*)
        error "Unknown option: $1"
        return 1
        ;;
      *)
        REPOSITORIES+=("$1")
        ;;
    esac
    shift
  done

  if [[ "${#REPOSITORIES[@]}" -eq 0 ]]; then
    error "At least one repository is required."
    usage
    return 1
  fi
}

main() {
  local failures=0
  local repository

  parse_args "$@"
  require_command git
  require_command awk
  require_command sed
  require_command find
  require_command mktemp
  require_command cmp

  mkdir -p "$WORK_DIR"

  for repository in "${REPOSITORIES[@]}"; do
    if ! process_repository "$repository"; then
      failures=$((failures + 1))
    fi
  done

  if [[ "$failures" -gt 0 ]]; then
    error "$failures repository migration(s) failed."
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
