#!/bin/bash
# ensure-dx-kb.sh — Ensures the PagoPA DX knowledge base is available locally.
#
# Called by the sessionStart hook. Clones or updates the pagopa/dx repository
# to $HOME/.dx so that DX skills can search documentation and module source
# code on the local filesystem.

set -euo pipefail

DX_KB_PATH="${DX_KB_PATH:-$HOME/.dx}"
DX_REPO_URL="https://github.com/pagopa/dx.git"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required but was not found in PATH." >&2
  exit 1
fi

# Read sessionStart input from stdin
INPUT=$(cat)
CWD=""
if command -v jq >/dev/null 2>&1; then
  CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null || printf '')
fi

resolve_path() {
  (
    cd "$1" 2>/dev/null && pwd -P
  )
}

echo "Ensuring DX knowledge base is available at $DX_KB_PATH..."

# --- Case 1: CWD is the DX repo itself ---
if [ -n "$CWD" ] && [ -d "$CWD/.git" ]; then
  REMOTE=$(git -C "$CWD" remote get-url origin 2>/dev/null || echo "")
  if echo "$REMOTE" | grep -q "pagopa/dx"; then
    CWD_RESOLVED=$(resolve_path "$CWD")

    # Ensure skills always find the current DX repo at $DX_KB_PATH
    if [ -e "$DX_KB_PATH" ]; then
      DX_KB_RESOLVED=$(resolve_path "$DX_KB_PATH" || true)
      if [ "$DX_KB_RESOLVED" = "$CWD_RESOLVED" ]; then
        exit 0
      fi
    fi

    mkdir -p "$(dirname "$DX_KB_PATH")"
    ln -sfn "$CWD_RESOLVED" "$DX_KB_PATH"
    exit 0
  fi
fi

# --- Case 2: Already cloned — update ---
if [ -d "$DX_KB_PATH/.git" ]; then
  git -C "$DX_KB_PATH" pull --ff-only 2>/dev/null || {
    git clone --depth 1 "$DX_REPO_URL" "$DX_KB_PATH" 2>/dev/null
  }
  exit 0
fi

# --- Case 3: Not present — fresh clone ---
git clone --depth 1 "$DX_REPO_URL" "$DX_KB_PATH" 2>/dev/null
