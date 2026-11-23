#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
output="$(mktemp)"
trap 'rm -f -- "$output"' EXIT

ALLOWED_DOMAINS=$'github.com\napi.github.com\n' \
  ADDITIONAL_ALLOWED_DOMAINS=$'\nmise-versions.jdx.dev\n' \
  GITHUB_OUTPUT="$output" bash "$script_dir/normalize-domains.sh"

expected=$'domains<<DX_RUNTIME_DOMAINS\ngithub.com\napi.github.com\nmise-versions.jdx.dev\nDX_RUNTIME_DOMAINS'
if [ "$(cat "$output")" != "$expected" ]; then
  echo "Domain lists were not normalized correctly" >&2
  exit 1
fi

: > "$output"
if ALLOWED_DOMAINS="invalid/domain" ADDITIONAL_ALLOWED_DOMAINS="" \
  GITHUB_OUTPUT="$output" bash "$script_dir/normalize-domains.sh" 2>/dev/null; then
  echo "Invalid domain was accepted" >&2
  exit 1
fi
if [ -s "$output" ]; then
  echo "Invalid domain produced an output" >&2
  exit 1
fi

bash "$script_dir/telemetry/test.sh"
bash "$script_dir/test-start-falco.sh"
