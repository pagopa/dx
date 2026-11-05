#!/usr/bin/env bash
# Build-time setup hook for the confluence-librarian skill evals.
#
# This lives at harbor/environment/prepare.sh: the harbor overlay adds it to
# every generated task's environment/ and the generated environment/Dockerfile
# runs it as /workspace/prepare.sh at image build time, before the git baseline
# commit. It installs the runtimes the agent needs inside the container:
#
#   - Node.js 22 LTS, pinned to an exact release and digest-verified below: the
#     Copilot CLI spawns the Atlassian MCP server (declared per task in the
#     [environment] of each harbor/<generated-task-dir>/task.toml) via
#     mcp-remote, which requires Node >= 20.18 — the distro nodejs (18.x on
#     ubuntu:24.04) is too old and makes the server exit before the MCP
#     initialize handshake. The exact release tarball is downloaded from
#     nodejs.org (not the rolling NodeSource setup script / repo) and must
#     match a pinned SHA-256, so identical benchmark commits build identical
#     images and no mutable remote script executes at build time.
#   - mcp-remote, baked globally so the agent container never needs the npm
#     registry at run time. Version-pinned; npm verifies the registry package
#     against its published integrity hash on install.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends curl ca-certificates xz-utils
rm -rf /var/lib/apt/lists/*

# Node.js 22.23.2 LTS (Jod), pinned by release + SHA-256 per architecture.
# Get digests from https://nodejs.org/dist/<version>/SHASUMS256.txt and bump
# NODE_VERSION with both digests together when you upgrade.
NODE_VERSION="22.23.2"
case "$(uname -m)" in
  x86_64 | amd64)
    NODE_ARCH="x64"
    NODE_SHA256="d60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307"
    ;;
  aarch64 | arm64)
    NODE_ARCH="arm64"
    NODE_SHA256="fff4078c5def658577f92c88db7db3bc0072924bfb93fe52c1e744a54e94abb8"
    ;;
  *)
    echo "prepare.sh: unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

node_url="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
curl -fsSL -o "$tmp/node.tar.xz" "$node_url"
echo "$NODE_SHA256  $tmp/node.tar.xz" | sha256sum -c - >&2
tar -xJf "$tmp/node.tar.xz" -C "$tmp"
cp -a "$tmp/node-v${NODE_VERSION}-linux-${NODE_ARCH}/." /usr/local/

# Bake the Atlassian MCP relay into the image; skip apt's bundled npm.
npm install -g mcp-remote@0.8.4

node --version
npm --version
command -v mcp-remote
