#!/usr/bin/env bash

resource_type=${1:?resource_type must be provided}
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$resource_type" in
  "Microsoft.Web/sites")
    # shellcheck disable=SC1091
    source "$script_dir/azure-appsvc.sh"
    ;;
  "Microsoft.App/containerApps")
    # shellcheck disable=SC1091
    source "$script_dir/azure-containerapp.sh"
    ;;
  *)
    echo "::error::Unsupported resource type: $resource_type"
    exit 1
    ;;
esac
