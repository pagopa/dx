#!/bin/bash
# ensure-dx-kb.sh - Ensures the PagoPA DX knowledge base is available locally.
#
# Called by the SessionStart hook. It links the current pagopa/dx checkout when
# possible, otherwise it keeps or creates a shallow clone at $DX_KB_PATH.
# Hook failures must not block the agent session: Terraform skills still perform
# their own checks before relying on the local knowledge base.

set -u

DEFAULT_DX_KB_HOME="${HOME:-${TMPDIR:-/tmp}}"
DX_KB_PATH="${DX_KB_PATH:-$DEFAULT_DX_KB_HOME/.dx}"
DX_REPO_URL="${DX_REPO_URL:-https://github.com/pagopa/dx.git}"
QUIET="${QUIET:-0}"

usage() {
  cat <<'EOF'
Usage: ensure-dx-kb.sh [--quiet] [--help]

Ensures the PagoPA DX knowledge base is available at DX_KB_PATH.

Environment:
  DX_KB_PATH   Target path for the local knowledge base. Default: $HOME/.dx,
               or $TMPDIR/.dx when HOME is unset.
  DX_REPO_URL  Repository URL to clone when no local checkout is available.
               Default: https://github.com/pagopa/dx.git
EOF
}

log() {
  if [ "$QUIET" != "1" ]; then
    printf '%s\n' "$1"
  fi
}

warn() {
  printf 'Warning: %s\n' "$1" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --quiet|-q)
      QUIET=1
      ;;
    *)
      warn "Ignoring unknown argument: $1"
      ;;
  esac
  shift
done

resolve_path() {
  (
    cd "$1" 2>/dev/null && pwd -P
  )
}

is_dx_repo() {
  local repo_path="$1"
  local remote

  [ -d "$repo_path/.git" ] || return 1

  remote=$(git -C "$repo_path" remote get-url origin 2>/dev/null || printf '')
  remote="${remote%/}"
  remote="${remote%.git}"

  case "$remote" in
    https://github.com/pagopa/dx|git@github.com:pagopa/dx|ssh://git@github.com/pagopa/dx)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

read_session_cwd() {
  local input

  input=$(cat 2>/dev/null || printf '')
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || printf ''
  else
    printf ''
  fi
}

link_current_repo() {
  local cwd="$1"
  local cwd_resolved
  local kb_resolved
  local kb_parent

  cwd_resolved=$(resolve_path "$cwd") || return 1

  if [ -e "$DX_KB_PATH" ] || [ -L "$DX_KB_PATH" ]; then
    kb_resolved=$(resolve_path "$DX_KB_PATH" || printf '')
    if [ "$kb_resolved" = "$cwd_resolved" ]; then
      log "DX knowledge base already points to $cwd_resolved."
      return 0
    fi

    if [ -d "$DX_KB_PATH/.git" ] || [ -d "$DX_KB_PATH" ]; then
      warn "$DX_KB_PATH already exists and is not the current checkout. Keeping it unchanged."
      return 1
    fi
  fi

  kb_parent=$(dirname "$DX_KB_PATH")
  if ! mkdir -p "$kb_parent" 2>/dev/null; then
    warn "Cannot create parent directory $kb_parent."
    return 1
  fi

  if ln -sfn "$cwd_resolved" "$DX_KB_PATH" 2>/dev/null; then
    log "DX knowledge base linked to current checkout: $cwd_resolved."
    return 0
  fi

  warn "Cannot create symlink $DX_KB_PATH -> $cwd_resolved."
  return 1
}

update_existing_clone() {
  if git -C "$DX_KB_PATH" pull --ff-only --quiet 2>/dev/null; then
    log "DX knowledge base updated at $DX_KB_PATH."
    return 0
  fi

  warn "Could not update $DX_KB_PATH. Keeping the existing checkout for offline use."
  return 0
}

clone_kb() {
  local kb_parent

  kb_parent=$(dirname "$DX_KB_PATH")
  if ! mkdir -p "$kb_parent" 2>/dev/null; then
    warn "Cannot create parent directory $kb_parent."
    return 0
  fi

  if git clone --depth 1 --quiet "$DX_REPO_URL" "$DX_KB_PATH" 2>/dev/null; then
    log "DX knowledge base cloned to $DX_KB_PATH."
    return 0
  fi

  warn "Could not clone $DX_REPO_URL to $DX_KB_PATH. Terraform skills may ask you to clone pagopa/dx manually or set DX_KB_PATH."
  return 0
}

main() {
  local cwd

  log "Ensuring DX knowledge base is available at $DX_KB_PATH..."

  if ! command -v git >/dev/null 2>&1; then
    warn "git is not available. Install git or set DX_KB_PATH to an existing pagopa/dx checkout."
    return 0
  fi

  cwd=$(read_session_cwd)
  if [ -n "$cwd" ] && is_dx_repo "$cwd"; then
    link_current_repo "$cwd" && return 0
  fi

  if [ -d "$DX_KB_PATH/.git" ]; then
    update_existing_clone
    return 0
  fi

  if [ -e "$DX_KB_PATH" ] || [ -L "$DX_KB_PATH" ]; then
    warn "$DX_KB_PATH exists but is not a git checkout. Set DX_KB_PATH to pagopa/dx or move the existing path."
    return 0
  fi

  clone_kb
}

main
exit 0
