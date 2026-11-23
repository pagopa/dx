#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
test_dir="$(mktemp -d)"
trap 'rm -rf -- "$test_dir"' EXIT

cat > "$test_dir/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  ps)
    if [[ "${DOCKER_PS_FAIL:-}" == "true" ]]; then exit 1; fi
    if [[ "${FALCO_RUNNING:-}" == "true" ]]; then echo falco; fi
    ;;
  stop)
    if [[ "${DOCKER_STOP_FAIL:-}" == "true" ]]; then exit 1; fi
    touch "$RUNNER_TEMP/stopped"
    ;;
  *) exit 1 ;;
esac
EOF
chmod +x "$test_dir/docker"
export PATH="$test_dir:$PATH" RUNNER_TEMP="$test_dir"
export GITHUB_STEP_SUMMARY="$test_dir/summary"
log="$test_dir/events"
touch "$test_dir/dx-runtime-hardening-falco-attempted"

awk 'BEGIN {
  for (i = 0; i < 12000; i++)
    print "{\"rule\":\"Sensitive action\",\"priority\":\"Warning\",\"output\":\"secret-command\",\"output_fields\":{\"proc.cmdline\":\"secret-command\"}}"
  print "{\"rule\":\"Another | <rule>\",\"priority\":\"Critical\",\"output\":\"secret-other\"}"
  print "not-json secret-invalid"
  print "123"
}' > "$log"
cp "$log" "$test_dir/original"
FALCO_RUNNING=true bash "$script_dir/stop.sh" "$log"
test -f "$test_dir/stopped"
cmp "$log" "$test_dir/original"
test "$(wc -c < "$GITHUB_STEP_SUMMARY")" -lt 1048576
grep -q '| Sensitive action | Warning | 12000 |' "$GITHUB_STEP_SUMMARY"
grep -q '| Another &#124; &lt;rule&gt; | Critical | 1 |' "$GITHUB_STEP_SUMMARY"
grep -q '2 invalid' "$GITHUB_STEP_SUMMARY"
if grep -Eq 'secret|proc\.cmdline|not-json' "$GITHUB_STEP_SUMMARY"; then
  echo "Sensitive or raw event data appeared in the summary" >&2
  exit 1
fi

: > "$GITHUB_STEP_SUMMARY"
awk 'BEGIN {
  for (i = 0; i < 10000; i++)
    printf "{\"rule\":\"unique-%05d-%0480d\",\"priority\":\"Warning\"}\n", i, i
}' > "$log"
FALCO_RUNNING=false bash "$script_dir/stop.sh" "$log"
test "$(wc -c < "$GITHUB_STEP_SUMMARY")" -lt 1048576
grep -q 'groups omitted' "$GITHUB_STEP_SUMMARY"
grep -q '| unique-00000-' "$GITHUB_STEP_SUMMARY"

: > "$GITHUB_STEP_SUMMARY"
jq -nrc 'range(0; 1500) | {rule: ("unicode-\(.)-" + ("\ud83d\ude00" * 480)), priority: "Warning"}' > "$log"
FALCO_RUNNING=false bash "$script_dir/stop.sh" "$log"
test "$(wc -c < "$GITHUB_STEP_SUMMARY")" -lt 1048576
grep -q 'groups omitted' "$GITHUB_STEP_SUMMARY"

: > "$GITHUB_STEP_SUMMARY"
rm -f -- "$test_dir/stopped"
printf '%s\n' '{"rule":"Startup event","priority":"Error"}' > "$log"
if FALCO_RUNNING=true DOCKER_STOP_FAIL=true bash "$script_dir/stop.sh" "$log" > "$test_dir/output" 2>&1; then
  echo "Docker stop failure was ignored" >&2
  exit 1
fi
grep -q 'Failed to stop Falco' "$test_dir/output"
grep -q '| Startup event | Error | 1 |' "$GITHUB_STEP_SUMMARY"

: > "$GITHUB_STEP_SUMMARY"
if DOCKER_PS_FAIL=true bash "$script_dir/stop.sh" "$log" > "$test_dir/output" 2>&1; then
  echo "Docker inspection failure was ignored" >&2
  exit 1
fi
grep -q 'Failed to inspect the Falco container' "$test_dir/output"
grep -q '| Startup event | Error | 1 |' "$GITHUB_STEP_SUMMARY"

if GITHUB_STEP_SUMMARY="$test_dir/missing/summary" FALCO_RUNNING=true \
  bash "$script_dir/stop.sh" "$log" > "$test_dir/output" 2>&1; then
  echo "Summary write failure was ignored" >&2
  exit 1
fi
grep -q 'Failed to write the Falco job summary' "$test_dir/output"

: > "$GITHUB_STEP_SUMMARY"
rm -f -- "$log"
touch "$test_dir/dx-runtime-hardening-falco-started"
if FALCO_RUNNING=false bash "$script_dir/stop.sh" "$log" > "$test_dir/output" 2>&1; then
  echo "Missing Falco event log was ignored" >&2
  exit 1
fi
grep -q 'Falco event log' "$test_dir/output"

rm -f -- "$test_dir/dx-runtime-hardening-falco-started"
FALCO_RUNNING=true bash "$script_dir/stop.sh" "$log"
test -f "$test_dir/stopped"

rm -f -- "$test_dir/dx-runtime-hardening-falco-attempted" "$test_dir/stopped"
DOCKER_PS_FAIL=true bash "$script_dir/stop.sh" "$log"
test ! -f "$test_dir/stopped"
