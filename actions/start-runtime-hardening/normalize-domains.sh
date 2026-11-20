#!/usr/bin/env bash
set -euo pipefail

domains="$(
  printf '%s\n%s\n' "$ALLOWED_DOMAINS" "$ADDITIONAL_ALLOWED_DOMAINS" |
    awk '
      {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "")
        if ($0 == "") next
        if ($0 !~ /^[A-Za-z0-9.*-]+$/) {
          print "Invalid allowed domain: " $0 > "/dev/stderr"
          exit 1
        }
        print
      }
    '
)"

printf 'domains<<DX_RUNTIME_DOMAINS\n%s\nDX_RUNTIME_DOMAINS\n' "$domains" >> "$GITHUB_OUTPUT"
