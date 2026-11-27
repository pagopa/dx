#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf -- "$test_dir"' EXIT

cat > "$test_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  run) echo container-id ;;
  inspect)
    if [[ "$TEST_FALCO_STATE" == "stopped" ]]; then echo false; else echo true; fi
    ;;
  exec)
    if [[ "$TEST_FALCO_STATE" == "ready" ]]; then
      echo '{"ready":true}'
    else
      echo '{"ready":false}'
    fi
    ;;
  stop) touch "$TEST_DIR/stopped" ;;
  *) exit 1 ;;
esac
EOF
cat > "$test_dir/sleep" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$test_dir/docker" "$test_dir/sleep"

export PATH="$test_dir:$PATH" RUNNER_TEMP="$test_dir" TEST_DIR="$test_dir"

TEST_FALCO_STATE=ready bash "$script_dir/start-falco.sh" > "$test_dir/output"
grep -q 'ready to monitor' "$test_dir/output"

if TEST_FALCO_STATE=stopped bash "$script_dir/start-falco.sh" > "$test_dir/output"; then
  echo "A stopped Falco container was accepted" >&2
  exit 1
fi
grep -q 'stopped before monitoring was ready' "$test_dir/output"

if TEST_FALCO_STATE=not-ready bash "$script_dir/start-falco.sh" > "$test_dir/output"; then
  echo "A Falco container that never became ready was accepted" >&2
  exit 1
fi
grep -q 'did not become ready' "$test_dir/output"
test -f "$test_dir/stopped"
