#!/usr/bin/env bash
set -euo pipefail

# Resolve the base git reference for change detection.
# If INPUT_BASE_REF is provided, use it directly.
# Otherwise, auto-detect from the GitHub event context.
# Inputs (env vars):
#   INPUT_BASE_REF  - Explicitly provided base ref (empty for auto-detection)
#   EVENT_NAME      - GitHub event name (push, pull_request, etc.)
#   EVENT_BEFORE    - For push events: the previous commit SHA
#   PR_BASE_SHA     - For PR events: the base branch SHA
#   DEFAULT_BRANCH  - Repository default branch name
# Output (GITHUB_OUTPUT):
#   base_ref - Resolved base reference

if [[ -n "${INPUT_BASE_REF:-}" ]]; then
  echo "base_ref=${INPUT_BASE_REF}" >> "${GITHUB_OUTPUT}"
  echo "Using provided base reference: ${INPUT_BASE_REF}"
  exit 0
fi

# Auto-detect base reference from event context
BASE_REF=""

if [[ "${EVENT_NAME:-}" == "pull_request" && -n "${PR_BASE_SHA:-}" ]]; then
  # For pull_request events, prefer the PR base SHA when available
  BASE_REF="${PR_BASE_SHA}"
elif [[ -n "${EVENT_BEFORE:-}" && "${EVENT_BEFORE}" != "0000000000000000000000000000000000000000" ]]; then
  # For push events, use the "before" SHA when it is a valid commit
  BASE_REF="${EVENT_BEFORE}"
else
  # For other events or when above data is unavailable, prefer merge-base
  # with the remote default branch, falling back conservatively.
  DEFAULT_REMOTE_REF="origin/${DEFAULT_BRANCH:-main}"
  if git rev-parse --verify "${DEFAULT_REMOTE_REF}" >/dev/null 2>&1; then
    if MERGE_BASE_SHA="$(git merge-base HEAD "${DEFAULT_REMOTE_REF}" 2>/dev/null)"; then
      BASE_REF="${MERGE_BASE_SHA}"
    else
      BASE_REF="${DEFAULT_REMOTE_REF}"
    fi
  elif git rev-parse HEAD~1 >/dev/null 2>&1; then
    BASE_REF="HEAD~1"
  else
    # Last-resort fallback to avoid emitting an empty base_ref
    BASE_REF="HEAD"
  fi
fi

echo "base_ref=${BASE_REF}" >> "${GITHUB_OUTPUT}"
echo "Auto-detected base reference: ${BASE_REF}"
