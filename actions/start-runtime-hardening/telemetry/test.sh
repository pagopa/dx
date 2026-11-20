#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
falco="$(mktemp)"
bullfrog="$(mktemp)"
events="$(mktemp)"
messages="$(mktemp)"
trap 'rm -f -- "$falco" "$bullfrog" "$events" "$messages"' EXIT

cat > "$falco" <<'EOF'
{"time":"2026-01-01T10:00:00Z","rule":"Sensitive action","priority":"Warning","output":"secret-falco-command","output_fields":{"proc.cmdline":"secret-falco-command"}}
not-json secret-invalid
EOF
cat > "$bullfrog" <<'EOF'
{"timestamp":"1767261600","domain":"example.com","dstIP":"192.0.2.1","dstPort":443,"protocol":"tcp","decision":"blocked","reason":"domain-not-allowed","commandLine":"secret-bullfrog-command","executablePath":"/secret/path"}
{"timestamp":"1767261601","domain":"registry.npmjs.org","dstPort":"443","protocol":"tcp","decision":"allowed","reason":"domain-allowed"}
{"decision":"missing"}
EOF

OTEL_EVENT_FILE="$events" GITHUB_JOB=workspace \
  bash "$script_dir/collect.sh" "$falco" "$bullfrog"

jq -se '
  length == 4 and
  .[0].name == "runtime-hardening.falco" and
  .[0].attributes["falco.rule"] == "Sensitive action" and
  .[0].attributes["falco.priority"] == "Warning" and
  .[0].attributes["cicd.job.id"] == "workspace" and
  .[1].name == "runtime-hardening.invalid-record" and
  .[2].name == "runtime-hardening.bullfrog" and
  .[2].attributes["network.destination.domain"] == "example.com" and
  .[2].attributes["network.destination.port"] == "443" and
  .[2].attributes["bullfrog.decision"] == "blocked" and
  .[3].name == "runtime-hardening.invalid-record"
' "$events" > /dev/null

if grep -Eq 'secret|192\.0\.2\.1|registry\.npmjs\.org' "$events"; then
  echo "Sensitive or unparsed data was included in telemetry" >&2
  exit 1
fi

: > "$falco"
printf '%s\n' '{"decision":"allowed","domain":"example.com"}' > "$bullfrog"
: > "$events"
OTEL_EVENT_FILE="$events" bash "$script_dir/collect.sh" "$falco" "$bullfrog"
if [ -s "$events" ]; then
  echo "Allowed connections produced telemetry" >&2
  exit 1
fi

: > "$events"
rm -f -- "$falco" "$bullfrog"
OTEL_EVENT_FILE="$events" RUNNER_TEMP="${TMPDIR:-/tmp}" \
  bash "$script_dir/collect.sh" "$falco" "$bullfrog" > "$messages"
grep -q 'Falco did not start' "$messages"
grep -q 'Bullfrog connection results are unavailable' "$messages"
if [ -s "$events" ]; then
  echo "Missing logs produced misleading findings" >&2
  exit 1
fi

if OTEL_EVENT_FILE="$events.missing" bash "$script_dir/collect.sh" \
  "$falco" "$bullfrog" > "$messages"; then
  echo "Missing telemetry session was accepted" >&2
  exit 1
fi
grep -q 'telemetry session is unavailable' "$messages"
