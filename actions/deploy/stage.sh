#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

resource_type=${1:?resource_type must be provided}
resource_name=${2:?resource_name must be provided}
image=${3:?image must be provided}
resource_group_name=${4:-}

# shellcheck disable=SC2329,SC2317
__stage() {
  echo "::error::__stage not implemented for this resource type."
  return 1
}

# shellcheck disable=SC1091
source "$script_dir/resource-type.sh" "$resource_type" "$resource_group_name"

stage() {
  __stage "$resource_group_name" "$resource_name" "$image"
}

stage
