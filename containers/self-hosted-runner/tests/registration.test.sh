#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Exercise the registration block from the real entrypoint without credentials or GitHub.
sed -n '/^if \[ ! -f ".runner" \]; then$/,/^# Cleanup$/p' "$root/entrypoint.sh" |
  sed '$d' >"$work/register.sh"
cat >"$work/config.sh" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$@" >args.txt
MOCK
chmod +x "$work/config.sh"
cd "$work"
export REPO_URL=https://github.com/example/test RUNNER_TOKEN=test RUNNER_NAME=test WORK_DIR=_work LABELS=dev-dx

bash register.sh
if grep -qx -- '--no-default-labels' args.txt; then
  echo "Default registration unexpectedly disabled default labels" >&2
  exit 1
fi

RUNNER_NO_DEFAULT_LABELS=true bash register.sh
grep -qx -- '--no-default-labels' args.txt
grep -qx -- 'dev-dx' args.txt

if RUNNER_NO_DEFAULT_LABELS=true LABELS=' , ' bash register.sh; then
  echo "Registration accepted an empty label list" >&2
  exit 1
fi

if RUNNER_NO_DEFAULT_LABELS=invalid bash register.sh; then
  echo "Registration accepted an invalid switch" >&2
  exit 1
fi

echo "Registration tests passed."
