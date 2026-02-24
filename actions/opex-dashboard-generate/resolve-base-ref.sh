#!/usr/bin/env bash
set -euo pipefail

# Resolve the base git reference for change detection.
# If --base-ref is provided, use it directly.
# Otherwise, auto-detect from the GitHub event context.
# 
# Usage:
#   resolve-base-ref.sh [OPTIONS]
#
# Options:
#   --base-ref <ref>         Explicitly provided base ref (overrides auto-detection)
#   --event-name <name>      GitHub event name (push, pull_request, etc.)
#   --event-before <sha>     For push events: the previous commit SHA
#   --pr-base-sha <sha>      For PR events: the base branch SHA
#   --default-branch <name>  Repository default branch name (default: main)
#
# Output (GITHUB_OUTPUT):
#   base_ref - Resolved base reference

# Parse command-line arguments
INPUT_BASE_REF=""
EVENT_NAME=""
EVENT_BEFORE=""
PR_BASE_SHA=""
DEFAULT_BRANCH="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-ref)
      INPUT_BASE_REF="$2"
      shift 2
      ;;
    --event-name)
      EVENT_NAME="$2"
      shift 2
      ;;
    --event-before)
      EVENT_BEFORE="$2"
      shift 2
      ;;
    --pr-base-sha)
      PR_BASE_SHA="$2"
      shift 2
      ;;
    --default-branch)
      DEFAULT_BRANCH="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "${INPUT_BASE_REF}" ]]; then
  echo "base_ref=${INPUT_BASE_REF}" >> "${GITHUB_OUTPUT}"
  echo "Using provided base reference: ${INPUT_BASE_REF}"
  exit 0
fi

# Auto-detect base reference from event context
BASE_REF=""

if [[ "${EVENT_NAME}" == "pull_request" && -n "${PR_BASE_SHA}" ]]; then
  # For pull_request events, prefer the PR base SHA when available
  BASE_REF="${PR_BASE_SHA}"
elif [[ -n "${EVENT_BEFORE}" && "${EVENT_BEFORE}" != "0000000000000000000000000000000000000000" ]]; then
  # For push events, use the "before" SHA when it is a valid commit
  BASE_REF="${EVENT_BEFORE}"
else
  # For other events or when above data is unavailable, prefer merge-base
  # with the remote default branch, falling back conservatively.
  DEFAULT_REMOTE_REF="origin/${DEFAULT_BRANCH}"
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
