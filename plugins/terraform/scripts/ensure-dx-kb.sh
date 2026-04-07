#!/bin/bash
# ensure-dx-kb.sh — Ensures the PagoPA DX knowledge base is available locally.
#
# Called by the sessionStart hook. Clones or updates the pagopa/dx repository
# to $HOME/.dx so that DX skills can search documentation and module source
# code on the local filesystem.

set -euo pipefail

DX_KB_PATH="${DX_KB_PATH:-$HOME/.dx}"
DX_REPO_URL="https://github.com/pagopa/dx.git"

# Read sessionStart input from stdin
INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

echo "Ensuring DX knowledge base is available at $DX_KB_PATH..."

# --- Case 1: CWD is the DX repo itself ---
if [ -n "$CWD" ] && [ -d "$CWD/.git" ]; then
  REMOTE=$(git -C "$CWD" remote get-url origin 2>/dev/null || echo "")
  if echo "$REMOTE" | grep -q "pagopa/dx"; then
    # Create a symlink so skills always find content at $DX_KB_PATH
    if [ ! -e "$DX_KB_PATH" ]; then
      ln -sf "$CWD" "$DX_KB_PATH"
    fi
    exit 0
  fi
fi

# --- Case 2: Already cloned — update ---
if [ -d "$DX_KB_PATH/.git" ]; then
  git -C "$DX_KB_PATH" pull --ff-only 2>/dev/null || {
    rm -rf "$DX_KB_PATH"
    git clone --depth 1 "$DX_REPO_URL" "$DX_KB_PATH" 2>/dev/null
  }
  exit 0
fi

# --- Case 3: Not present — fresh clone ---
rm -rf "$DX_KB_PATH" 2>/dev/null || true
git clone --depth 1 "$DX_REPO_URL" "$DX_KB_PATH" 2>/dev/null
