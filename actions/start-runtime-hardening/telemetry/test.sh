#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
falco="$(mktemp)"
bullfrog="$(mktemp)"
events="$(mktemp)"
messages="$(mktemp)"
timeline="$(mktemp)"
trap 'rm -f -- "$falco" "$bullfrog" "$events" "$messages" "$timeline"' EXIT

cat > "$timeline" <<'EOF'
[
  {"name":"Checkout","start":1767261599,"end":1767261630},
  {"name":"Build","start":1767261630,"end":1767261800},
  {"name":"Parallel worker","start":1767261650,"end":1767261690}
]
EOF

cat > "$falco" <<'EOF'
{"time":"2026-01-01T10:00:00Z","rule":"Sensitive action","priority":"Warning","output":"secret-falco-command","output_fields":{"proc.cmdline":"secret-falco-command"}}
{"time":"2026-01-01T10:01:00.123456789+0000","rule":"Sensitive action","priority":"Warning","output":"secret-second-command"}
{"time":"2026-01-01T11:01:00+0100","rule":"Sensitive action","priority":"Warning"}
{"time":"2026-01-01T10:02:00Z","rule":"Sensitive action","priority":"Critical"}
not-json secret-invalid
EOF
cat > "$bullfrog" <<'EOF'
{"timestamp":"1767261600000","domain":"example.com","dstIP":"192.0.2.1","dstPort":443,"protocol":"tcp","decision":"blocked","reason":"domain-not-allowed","commandLine":"secret-bullfrog-command","executablePath":"/secret/path"}
{"timestamp":"1767261601","domain":"registry.npmjs.org","dstPort":"443","protocol":"tcp","decision":"allowed","reason":"domain-allowed"}
{"decision":"missing"}
EOF

OTEL_EVENT_FILE="$events" GITHUB_JOB=workspace GITHUB_SERVER_URL=https://github.com \
  GITHUB_REPOSITORY=pagopa/dx GITHUB_RUN_ID=42 \
  bash "$script_dir/collect.sh" "$falco" "$bullfrog" "$timeline"

jq -se '
  length == 6 and
  ([.[] | select(.name == "runtime-hardening.falco" and
                  .attributes["falco.priority"] == "Warning" and
                  (.attributes["cicd.job.step.names"] | fromjson) == ["Build","Parallel worker"]) |
    select(.attributes["falco.rule"] == "Sensitive action" and
           .attributes["falco.count"] == "2" and
           .attributes["security.event.time"] == "2026-01-01T11:01:00+0100" and
           .attributes["cicd.pipeline.run.url.full"] == "https://github.com/pagopa/dx/actions/runs/42" and
           .attributes["cicd.job.id"] == "workspace")] | length) == 1 and
  ([.[] | select(.name == "runtime-hardening.falco" and
                  .attributes["falco.priority"] == "Warning" and
                  (.attributes["cicd.job.step.names"] | fromjson) == ["Checkout"] and
                  .attributes["falco.count"] == "1")] | length) == 1 and
  ([.[] | select(.name == "runtime-hardening.falco" and
                  .attributes["falco.priority"] == "Critical" and
                  .attributes["falco.count"] == "1")] | length) == 1 and
  ([.[] | select(.name == "runtime-hardening.bullfrog" and
                  .attributes["network.destination.domain"] == "example.com" and
                  .attributes["network.destination.port"] == "443" and
                  .attributes["bullfrog.decision"] == "blocked" and
                  (.attributes["cicd.job.step.names"] | fromjson) == ["Checkout"] and
                  .attributes["cicd.pipeline.run.url.full"] == "https://github.com/pagopa/dx/actions/runs/42")] | length) == 1 and
  ([.[] | select(.name == "runtime-hardening.invalid-record")] | length) == 2
' "$events" > /dev/null

if grep -Eq 'secret|192\.0\.2\.1|registry\.npmjs\.org' "$events"; then
  echo "Sensitive or unparsed data was included in telemetry" >&2
  exit 1
fi

printf '%s\n' '{"time":"not-a-timestamp","rule":"Unmapped","priority":"Warning"}' > "$falco"
printf '%s\n' '{"timestamp":"unknown","decision":"blocked","domain":"example.com"}' > "$bullfrog"
: > "$events"
OTEL_EVENT_FILE="$events" bash "$script_dir/collect.sh" "$falco" "$bullfrog" "$timeline"
jq -se '
  length == 2 and
  all(.[]; (.attributes["cicd.job.step.names"] | fromjson) == [])
' "$events" > /dev/null

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
