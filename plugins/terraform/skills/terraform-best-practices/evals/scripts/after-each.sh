#!/usr/bin/env bash
# Skill-owned after-each hook: format check and Terraform cache cleanup.
set -euo pipefail

workspace="${SKILL_EVAL_WORKSPACE:?SKILL_EVAL_WORKSPACE is required}"
artifact_dir="${SKILL_EVAL_ARTIFACT_DIR:-}"
terraform_format=null

if [[ -d "${workspace}/infra" ]] && command -v terraform >/dev/null 2>&1; then
  fmt_log="/dev/null"
  if [[ -n "${artifact_dir}" ]]; then
    fmt_log="${artifact_dir}/terraform-fmt.txt"
  fi
  if terraform fmt -check -recursive "${workspace}/infra" >"${fmt_log}" 2>&1; then
    terraform_format=true
  else
    terraform_format=false
  fi
fi

printf '{"terraformFormat": %s}\n' "${terraform_format}"

while IFS= read -r terraform_dir; do
  rm -rf -- "${terraform_dir}"
done < <(find "${workspace}" -type d -name .terraform -prune -print)
