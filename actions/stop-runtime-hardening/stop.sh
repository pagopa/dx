#!/usr/bin/env bash
set -euo pipefail

falco_log="$1"
status=0

if [[ ! -f "$RUNNER_TEMP/dx-runtime-hardening-falco-attempted" ]]; then
  echo "Falco startup was not attempted; skipping cleanup."
  exit 0
fi

if ! running="$(docker ps --filter 'name=^/falco$' --format '{{.Names}}')"; then
  echo "::error::Failed to inspect the Falco container."
  status=1
elif [[ "$running" == "falco" ]] && ! docker stop falco > /dev/null; then
  echo "::error::Failed to stop Falco."
  status=1
fi

if [[ ! -r "$falco_log" ]]; then
  if [[ -e "$falco_log" || -f "$RUNNER_TEMP/dx-runtime-hardening-falco-started" ]]; then
    echo "::error::Falco event log is unavailable or unreadable."
    status=1
  else
    echo "::warning::Falco did not start; no event log was created."
  fi
  exit "$status"
fi

summary="$(mktemp)"
trap 'rm -f -- "$summary"' EXIT

if ! jq -Rnr '
  def safe_string:
    if type == "string" and length > 0 and length <= 512 then . else "" end;
  def escape_cell:
    gsub("[\u0000-\u001f\u007f]"; " ") | @html |
    gsub("\\|"; "&#124;") | gsub("\\["; "&#91;") |
    gsub("\\]"; "&#93;") | gsub("`"; "&#96;") |
    gsub("\\\\"; "&#92;");

  (reduce (inputs | select(length > 0)) as $line
    ({groups: {}, invalid: 0};
     (try ($line | fromjson) catch null) as $entry |
     if ($entry | type) != "object" or
        ($entry.rule | safe_string) == "" or
        ($entry.priority | safe_string) == "" then
       .invalid += 1
     else
       ($entry.rule | safe_string) as $rule |
       ($entry.priority | safe_string) as $priority |
       ([$rule, $priority] | tojson) as $key |
       .groups[$key] //= {rule: $rule, priority: $priority, count: 0} |
       .groups[$key].count += 1
     end)) as $result |
  reduce ($result.groups | to_entries | sort_by(.value.rule, .value.priority)[]) as $group
    ({body: "# Falco events\n\n| Rule | Priority | Count |\n| --- | --- | ---: |\n", omitted: 0};
     ("| " + ($group.value.rule | escape_cell) + " | " +
      ($group.value.priority | escape_cell) + " | " +
      ($group.value.count | tostring) + " |\n") as $row |
     if ((.body | length) + ($row | length)) <= 200000 then
       .body += $row
     else
       .omitted += 1
     end) |
  .body,
  (if .omitted > 0 then "\n\(.omitted) groups omitted to keep the summary compact." else empty end),
  (if $result.invalid > 0 then "\n\($result.invalid) invalid Falco records omitted." else empty end)
' < "$falco_log" > "$summary"; then
  echo "::error::Failed to aggregate Falco events."
  status=1
elif ! cat "$summary" >> "$GITHUB_STEP_SUMMARY"; then
  echo "::error::Failed to write the Falco job summary."
  status=1
fi

exit "$status"
