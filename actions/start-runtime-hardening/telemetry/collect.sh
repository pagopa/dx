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
    def invalid_record:
      {type: "event", name: "runtime-hardening.invalid-record",
       body: ("Invalid " + $source + " record"), exception: false,
       attributes: (attributes + {"security.source": $source})};

    if $source == "falco" then
      reduce (inputs | select(length > 0)) as $line
        ({groups: {}, invalid: 0};
         (try ($line | fromjson) catch null) as $entry |
         if ($entry | type) != "object" then
           .invalid += 1
         elif ($entry.rule | safe_string) == "" or
              ($entry.priority | safe_string) == "" then
           .invalid += 1
         else
           ($entry.rule | safe_string) as $rule |
           ($entry.priority | safe_string) as $priority |
           ([$rule, $priority] | tojson) as $key |
           .groups[$key] //= {rule: $rule, priority: $priority, count: 0} |
           .groups[$key].count += 1 |
           .groups[$key].time = ($entry.time | safe_string)
         end) |
      (.groups[] |
       {type: "event", name: "runtime-hardening.falco",
        body: "Falco rule triggered", exception: false,
        attributes: (attributes + {
          "security.source": "falco",
          "falco.rule": .rule,
          "falco.priority": .priority,
          "falco.count": (.count | tostring),
          "security.event.time": .time
        })}),
      (range(0; .invalid) | invalid_record)
    else
      inputs | select(length > 0) |
      (try fromjson catch null) as $entry |
      if ($entry | type) != "object" then
        invalid_record
      elif $entry.decision != "allowed" and $entry.decision != "blocked" then
        invalid_record
      elif $entry.decision == "allowed" then
        empty
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
