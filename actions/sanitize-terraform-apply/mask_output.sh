#!/bin/bash

set -e
set -o pipefail

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Reads Terraform output from stdin and masks sensitive values."
  echo
  echo "Options / Environment Variables:"
  echo "  --sensitive-keys      (Var: SENSITIVE_KEYS) A comma-separated list of sensitive keys. (Required)"
  echo "  -h, --help            Show this help message."
  exit 1
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --sensitive-keys)
      SENSITIVE_KEYS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Error: Unrecognized option: $1"
      usage
      ;;
  esac
done

if [[ -z "${SENSITIVE_KEYS:-}" ]]; then
  echo "::error::The following parameter is required (via arguments or environment variables): --sensitive-keys"
  usage
fi

SENSITIVE_KEYS="$SENSITIVE_KEYS" perl -ne '
  BEGIN {
    @keys = grep { length } map { s/^\s+|\s+$//gr } split /,/, ($ENV{SENSITIVE_KEYS} // q{});
  }

  for my $key (@keys) {
    s/("?\Q$key\E[^"]*"?\s*=\s*)"[^"]*"(\s*->\s*)"[^"]*"/$1"[REDACTED]"$2"[REDACTED]"/ig;
    s/("?\Q$key\E[^"]*"?\s*=\s*)"[^"]*"/$1"[REDACTED]"/ig;
  }

  s/-----BEGIN\s+.*?-----.*?-----END\s+.*?-----/[REDACTED]/ig;
  s/("?[^"\s]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)([^A-Za-z0-9]|$)"?\s*[:=]\s*)"([^"]{12,})"(\s*->\s*)"([^"]{12,})"/$1"[REDACTED]"$5"[REDACTED]"/ig;
  s/("?[^"\s]*(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)([^A-Za-z0-9]|$)"?\s*[:=]\s*)"([^"]{12,})"/$1"[REDACTED]"/ig;

  print;
'
