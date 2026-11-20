#!/usr/bin/env bash
# Build-time setup hook for the confluence-librarian skill evals.
#
# This lives at harbor/environment/prepare.sh: the harbor overlay adds it to
# every generated task's environment/ and the generated environment/Dockerfile
# runs it as /workspace/prepare.sh at image build time, before the git baseline
# commit. Node.js is supplied by the generated Dockerfile; install the pinned
# MCP relay so the agent does not need the npm registry at runtime.
set -euo pipefail

npm install -g mcp-remote@0.8.4
command -v mcp-remote
