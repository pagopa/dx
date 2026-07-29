#!/usr/bin/env bash

set -euo pipefail

if matches=$(git grep -n -i -e 'tfsec' -- . ':(exclude)infra/scripts/check-legacy-scanner-reference.sh'); then
  echo "Legacy Terraform scanner references were found:"
  echo "$matches"
  exit 1
fi
