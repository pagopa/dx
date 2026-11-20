#!/usr/bin/env bash
set -euo pipefail

falco_log="$1"
bullfrog_log="$2"

if [[ -z "${OTEL_EVENT_FILE:-}" || ! -f "$OTEL_EVENT_FILE" ]]; then
  echo "::warning::Runtime hardening telemetry session is unavailable."
  exit 1
fi

collect() {
  local source="$1" file="$2"
  jq -Rnc --arg source "$source" --arg job "${GITHUB_JOB:-}" '
    def safe_string:
      if type == "string" and length > 0 and length <= 512 then . else "" end;
    def attributes:
      { "cicd.job.id": $job };

    inputs | select(length > 0) |
    (try fromjson catch null) as $entry |
    if ($entry | type) != "object" then
      {type: "event", name: "runtime-hardening.invalid-record",
       body: ("Invalid " + $source + " record"), exception: false,
       attributes: (attributes + {"security.source": $source})}
    elif ($source == "falco" and
          (($entry.rule | safe_string) == "" or
           ($entry.priority | safe_string) == "")) or
         ($source == "bullfrog" and
          ($entry.decision != "allowed" and $entry.decision != "blocked")) then
      {type: "event", name: "runtime-hardening.invalid-record",
       body: ("Invalid " + $source + " record"), exception: false,
       attributes: (attributes + {"security.source": $source})}
    elif $source == "bullfrog" and $entry.decision == "allowed" then
      empty
    elif $source == "falco" then
      {type: "event", name: "runtime-hardening.falco",
       body: "Falco rule triggered", exception: false,
       attributes: (attributes + {
         "security.source": "falco",
         "falco.rule": ($entry.rule | safe_string),
         "falco.priority": ($entry.priority | safe_string),
         "security.event.time": ($entry.time | safe_string)
       })}
    else
      {type: "event", name: "runtime-hardening.bullfrog",
       body: "Bullfrog connection decision", exception: false,
       attributes: (attributes + {
         "security.source": "bullfrog",
         "network.destination.domain": ($entry.domain | safe_string),
         "bullfrog.decision": ($entry.decision | safe_string),
         "bullfrog.reason": ($entry.reason | safe_string),
         "network.protocol.name": ($entry.protocol | safe_string),
         "network.destination.port": (if ($entry.dstPort | type) == "number"
           then ($entry.dstPort | tostring) else ($entry.dstPort | safe_string) end),
         "security.event.time": (if ($entry.timestamp | type) == "number"
           then ($entry.timestamp | tostring) else ($entry.timestamp | safe_string) end)
       })}
    end
  ' < "$file" >> "$OTEL_EVENT_FILE"
}

if [[ -r "$falco_log" ]]; then
  if ! collect falco "$falco_log"; then
    echo "::warning::Failed to collect Falco events."
  fi
elif [[ -e "$falco_log" ]]; then
  echo "::warning::Falco events are not readable."
elif [[ ! -f "${RUNNER_TEMP:-}/dx-runtime-hardening-falco-started" ]]; then
  echo "::warning::Falco did not start; no Falco events were collected."
fi

if [[ -r "$bullfrog_log" ]]; then
  if ! collect bullfrog "$bullfrog_log"; then
    echo "::warning::Failed to collect Bullfrog connection results."
  fi
else
  echo "::warning::Bullfrog connection results are unavailable or unreadable."
fi
