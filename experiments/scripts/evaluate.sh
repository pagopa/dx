#!/usr/bin/env bash
# evaluate.sh <output_dir> [score_out.json]
# Grades a generated Terraform output directory against the DX checklist (12 checks).
# Exits 0 always; writes results to score_out.json (default: <output_dir>/../score.json).
set -euo pipefail

OUTPUT_DIR="${1:-}"
if [[ -z "$OUTPUT_DIR" || ! -d "$OUTPUT_DIR" ]]; then
  echo "Usage: $0 <output_dir> [score_out.json]" >&2
  exit 1
fi

SCORE_FILE="${2:-$(dirname "$OUTPUT_DIR")/score.json}"

TF_FILES=$(find "$OUTPUT_DIR" -name "*.tf" 2>/dev/null | sort)
ALL_TF_CONTENT=""
if [[ -n "$TF_FILES" ]]; then
  ALL_TF_CONTENT=$(echo "$TF_FILES" | xargs cat 2>/dev/null || true)
fi

# ── 1. terraform validate ──────────────────────────────────────────────────────
validate="false"
validate_detail="no .tf files found"
if [[ -n "$TF_FILES" ]]; then
  if command -v terraform &>/dev/null; then
    tmp_dir=$(mktemp -d)
    cp "$OUTPUT_DIR"/*.tf "$tmp_dir/" 2>/dev/null || true
    if terraform -chdir="$tmp_dir" init -backend=false -input=false -no-color &>/dev/null \
       && terraform -chdir="$tmp_dir" validate -no-color &>/dev/null; then
      validate="true"
      validate_detail="passed"
    else
      validate_detail="failed"
    fi
    rm -rf "$tmp_dir"
  else
    validate_detail="terraform not installed — skipped"
  fi
fi

# ── 2. naming: provider::dx::resource_name() ──────────────────────────────────
naming="false"
naming_detail="not found"
if echo "$ALL_TF_CONTENT" | grep -qE 'provider::dx::resource_name|naming_config'; then
  naming="true"
  naming_detail="found provider::dx::resource_name() and naming_config local"
fi

# ── 3. tags: all 6 required tags (incl. Source) ───────────────────────────────
tags="false"
tags_detail="missing tags"
missing_tags=()
for tag in CostCenter CreatedBy Environment BusinessUnit ManagementTeam Source; do
  if ! echo "$ALL_TF_CONTENT" | grep -q "$tag"; then
    missing_tags+=("$tag")
  fi
done
if [[ ${#missing_tags[@]} -eq 0 ]]; then
  tags="true"
  tags_detail="all 6 required tags present (incl. Source)"
else
  tags_detail="missing: ${missing_tags[*]}"
fi

# ── 4. secrets: no hardcoded passwords, KV references ─────────────────────────
secrets="false"
secrets_detail="no Key Vault references found"
hardcoded="false"
if echo "$ALL_TF_CONTENT" | grep -qiE 'password\s*=\s*"[^$][^"]{3,}"'; then
  hardcoded="true"
fi
kv_refs="false"
if echo "$ALL_TF_CONTENT" | grep -qE '@Microsoft\.KeyVault\(|key_vault_secret_id|azurerm_key_vault_secret'; then
  kv_refs="true"
fi
if [[ "$kv_refs" == "true" && "$hardcoded" == "false" ]]; then
  secrets="true"
  secrets_detail="Key Vault references used, no hardcoded secrets"
elif [[ "$hardcoded" == "true" ]]; then
  secrets_detail="hardcoded secrets detected"
fi

# ── 5. networking: dx_available_subnet_cidr ───────────────────────────────────
networking="false"
networking_detail="dx_available_subnet_cidr not found"
if echo "$ALL_TF_CONTENT" | grep -q "dx_available_subnet_cidr"; then
  networking="true"
  networking_detail="dx_available_subnet_cidr found"
fi

# ── 6. modules: pagopa-dx/* with ~> version pin ───────────────────────────────
modules="false"
modules_detail="no pagopa-dx modules found"
if echo "$ALL_TF_CONTENT" | grep -qE 'source\s*=\s*"pagopa-dx/'; then
  if echo "$ALL_TF_CONTENT" | grep -qE 'version\s*=\s*"~>'; then
    modules="true"
    modules_detail="pagopa-dx modules found with ~> version pin"
  else
    modules_detail="pagopa-dx modules found but version not pinned with ~>"
  fi
fi

# ── 7 & 8. Dynamic Registry checks (coverage + version) ─────────────────────
# Fetches all pagopa-dx modules from Terraform Registry on the fly.
SCRIPTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_TF_TMP=$(mktemp)
echo "$ALL_TF_CONTENT" > "$_TF_TMP"

IFS=$'\t' read -r coverage modules_version coverage_detail modules_version_detail < <(
  python3 "$SCRIPTDIR/registry_check.py" "$_TF_TMP" 2>/dev/null || printf 'false\tfalse\tregistry-check-failed\tregistry-check-failed'
)
rm -f "$_TF_TMP"
coverage="${coverage:-false}"
modules_version="${modules_version:-false}"
coverage_detail="${coverage_detail:-registry check failed}"
modules_version_detail="${modules_version_detail:-registry check failed}"

# ── 9. file_structure: canonical DX files exist ───────────────────────────────
file_structure="false"
file_structure_detail=""
missing_files=()
for f in main.tf variables.tf outputs.tf locals.tf providers.tf; do
  if [[ ! -f "$OUTPUT_DIR/$f" ]]; then
    missing_files+=("$f")
  fi
done
if [[ ${#missing_files[@]} -eq 0 ]]; then
  file_structure="true"
  file_structure_detail="all canonical files present (main, variables, outputs, locals, providers)"
else
  file_structure_detail="missing: ${missing_files[*]}"
fi

# ── 10. dx_provider: pagopa-dx/azure provider declared with ~> version ────────
dx_provider="false"
dx_provider_detail="pagopa-dx/azure provider not declared"
if echo "$ALL_TF_CONTENT" | grep -qE 'source\s*=\s*"pagopa-dx/azure"'; then
  if echo "$ALL_TF_CONTENT" | grep -A3 'pagopa-dx/azure"' | grep -qE 'version\s*=\s*"~>'; then
    dx_provider="true"
    dx_provider_detail="pagopa-dx/azure declared with ~> version pin"
  else
    dx_provider_detail="pagopa-dx/azure declared but version not pinned with ~>"
  fi
fi

# ── 11. no_github_sources: no github.com/pagopa module references ─────────────
no_github="false"
no_github_detail="github.com/pagopa module sources detected (use Terraform Registry instead)"
if ! echo "$ALL_TF_CONTENT" | grep -qE 'source\s*=\s*"github\.com/pagopa'; then
  no_github="true"
  no_github_detail="no github.com sources found, Registry used correctly"
fi

# ── 12. variable_descriptions: every variable block has a description ─────────
var_descriptions="false"
var_descriptions_detail="no variable blocks found"
if echo "$ALL_TF_CONTENT" | grep -q 'variable "'; then
  # Count variable blocks and those with description
  total_vars=$(echo "$ALL_TF_CONTENT" | grep -c '^variable "' || echo "0")
  vars_with_desc=$(echo "$ALL_TF_CONTENT" | grep -c 'description\s*=' || echo "0")
  if [[ "$total_vars" -gt 0 && "$vars_with_desc" -ge "$total_vars" ]]; then
    var_descriptions="true"
    var_descriptions_detail="all ${total_vars} variable(s) have description"
  else
    var_descriptions_detail="only ${vars_with_desc}/${total_vars} variable(s) have description"
  fi
fi

# ── 13. createdby_terraform: CreatedBy tag set to "Terraform" ─────────────────
createdby_tf="false"
createdby_tf_detail='CreatedBy tag not set to "Terraform"'
if echo "$ALL_TF_CONTENT" | grep -qE 'CreatedBy\s*=\s*"Terraform"'; then
  createdby_tf="true"
  createdby_tf_detail='CreatedBy = "Terraform" found'
fi

# ── 14. azurerm_4x: hashicorp/azurerm pinned to ~> 4.x ───────────────────────
azurerm_4x="false"
azurerm_4x_detail="hashicorp/azurerm not pinned to ~> 4.x"
if echo "$ALL_TF_CONTENT" | grep -qE 'source\s*=\s*"hashicorp/azurerm"'; then
  if echo "$ALL_TF_CONTENT" | grep -A3 '"hashicorp/azurerm"' | grep -qE 'version\s*=\s*"~>\s*4\.'; then
    azurerm_4x="true"
    azurerm_4x_detail="hashicorp/azurerm pinned to ~> 4.x"
  else
    azurerm_4x_detail="hashicorp/azurerm declared but not pinned to ~> 4.x"
  fi
fi

# ── 15. storage_azuread: storage_use_azuread = true in azurerm provider ────────
storage_azuread="false"
storage_azuread_detail="storage_use_azuread = true not set in azurerm provider"
if echo "$ALL_TF_CONTENT" | grep -qE 'storage_use_azuread\s*=\s*true'; then
  storage_azuread="true"
  storage_azuread_detail="storage_use_azuread = true set (AAD-only storage auth)"
fi

# ── 16. naming_config_fields: naming_config local has all 6 required fields ───
naming_fields="false"
naming_fields_detail="naming_config local missing or incomplete"
required_fields=(prefix env_short location domain app_name instance_number)
missing_fields=()
if echo "$ALL_TF_CONTENT" | grep -q "naming_config"; then
  for field in "${required_fields[@]}"; do
    if ! echo "$ALL_TF_CONTENT" | grep -qE "^\s+${field}\s*="; then
      missing_fields+=("$field")
    fi
  done
  if [[ ${#missing_fields[@]} -eq 0 ]]; then
    naming_fields="true"
    naming_fields_detail="naming_config has all 6 required fields"
  else
    naming_fields_detail="naming_config missing fields: ${missing_fields[*]}"
  fi
fi
score=0
for val in "$validate" "$naming" "$tags" "$secrets" "$networking" "$modules" \
           "$coverage" "$modules_version" "$file_structure" "$dx_provider" \
           "$no_github" "$var_descriptions" \
           "$createdby_tf" "$azurerm_4x" "$storage_azuread" "$naming_fields"; do
  [[ "$val" == "true" ]] && ((score++)) || true
done

# ── Write JSON ─────────────────────────────────────────────────────────────────
# Use env vars to avoid shell interpolation of special chars (quotes, backticks)
export _SCORE_FILE="$SCORE_FILE"
export _SCORE="$score"
export _v_validate="$validate"          _d_validate="$validate_detail"
export _v_naming="$naming"              _d_naming="$naming_detail"
export _v_tags="$tags"                  _d_tags="$tags_detail"
export _v_secrets="$secrets"            _d_secrets="$secrets_detail"
export _v_networking="$networking"      _d_networking="$networking_detail"
export _v_modules="$modules"            _d_modules="$modules_detail"
export _v_coverage="$coverage"          _d_coverage="$coverage_detail"
export _v_modver="$modules_version"     _d_modver="$modules_version_detail"
export _v_files="$file_structure"       _d_files="$file_structure_detail"
export _v_dxprov="$dx_provider"         _d_dxprov="$dx_provider_detail"
export _v_nogh="$no_github"             _d_nogh="$no_github_detail"
export _v_vardesc="$var_descriptions"   _d_vardesc="$var_descriptions_detail"
export _v_crby="$createdby_tf"          _d_crby="$createdby_tf_detail"
export _v_az4x="$azurerm_4x"            _d_az4x="$azurerm_4x_detail"
export _v_azuread="$storage_azuread"    _d_azuread="$storage_azuread_detail"
export _v_namfld="$naming_fields"       _d_namfld="$naming_fields_detail"

python3 - <<'PYEOF'
import json, os

def chk(v, d): return {"pass": os.environ.get(v) == "true", "detail": os.environ.get(d, "")}

checks = {
    "validate":              chk("_v_validate",  "_d_validate"),
    "naming":                chk("_v_naming",    "_d_naming"),
    "tags":                  chk("_v_tags",      "_d_tags"),
    "secrets":               chk("_v_secrets",   "_d_secrets"),
    "networking":            chk("_v_networking","_d_networking"),
    "modules":               chk("_v_modules",   "_d_modules"),
    "dx_modules_coverage":   chk("_v_coverage",  "_d_coverage"),
    "modules_version":       chk("_v_modver",    "_d_modver"),
    "file_structure":        chk("_v_files",     "_d_files"),
    "dx_provider":           chk("_v_dxprov",    "_d_dxprov"),
    "no_github_sources":     chk("_v_nogh",      "_d_nogh"),
    "variable_descriptions": chk("_v_vardesc",   "_d_vardesc"),
    "createdby_terraform":   chk("_v_crby",      "_d_crby"),
    "azurerm_4x":            chk("_v_az4x",      "_d_az4x"),
    "storage_azuread":       chk("_v_azuread",   "_d_azuread"),
    "naming_config_fields":  chk("_v_namfld",    "_d_namfld"),
}
result = {"score": int(os.environ.get("_SCORE", 0)), "max": 16, "checks": checks}
with open(os.environ["_SCORE_FILE"], "w") as f:
    json.dump(result, f, indent=2)
PYEOF

echo "Score: $score/16  →  $SCORE_FILE"
