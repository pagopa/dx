#!/usr/bin/env bash
# Build-time setup hook for the confluence-librarian skill evals.
#
# harbor-bench copies this into the generated task workspace as prepare.sh and
# the environment Dockerfile runs it at image build time, before the git
# baseline commit. It installs the runtimes the agent needs inside the
# container:
#
#   - Node.js 22 LTS (NodeSource): the Copilot CLI spawns the Atlassian MCP
#     server (harbor/environment.toml) via mcp-remote, and current mcp-remote
#     requires Node >= 20.18 — the distro nodejs (18.x on ubuntu:24.04) is too
#     old and makes the server exit before the MCP initialize handshake.
#   - mcp-remote, baked globally so the agent container never needs the npm
#     registry at run time.
#   - python3: eval 3 runs the skill's bundled `scripts/prepare_markdown.py`.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends curl ca-certificates gnupg python3
rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS from NodeSource (replaces the distro nodejs 18.x).
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
rm -rf /var/lib/apt/lists/*

# Bake the Atlassian MCP relay into the image; skip apt's bundled npm.
# Pinned so identical benchmark commits build identical images (the README's
# host OAuth bootstrap command uses the same version — bump both together).
npm install -g mcp-remote@0.8.4
node --version
command -v mcp-remote
