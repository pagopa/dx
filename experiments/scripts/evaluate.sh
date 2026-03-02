#!/usr/bin/env bash
# evaluate.sh <output_dir> [score_out.json]
# Grades a generated Terraform output directory against the DX checklist.
# Exits 0 always; writes results to score_out.json (default: <output_dir>/../score.json).
set -euo pipefail

OUTPUT_DIR="${1:-}"
if [[ -z "$OUTPUT_DIR" || ! -d "$OUTPUT_DIR" ]]; then
  echo "Usage: $0 <output_dir> [score_out.json]" >&2
  exit 1
fi

SCORE_FILE="${2:-$(dirname "$OUTPUT_DIR")/score.json}"

TF_FILES=$(find "$OUTPUT_DIR" -name "*.tf" 2>/dev/null | sort)

pass() { echo "true"; }
fail() { echo "false"; }

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
if echo "$TF_FILES" | xargs grep -l "provider::dx::resource_name\|pagopa-dx/azure\|pagopa-dx/aws" 2>/dev/null | grep -q .; then
  naming="true"
  naming_detail="found provider::dx::resource_name() or DX provider"
fi

# ── 3. tags: all 5 required tags ──────────────────────────────────────────────
ALL_TF_CONTENT=$(echo "$TF_FILES" | xargs cat 2>/dev/null || true)
tags="false"
tags_detail="missing tags"
missing_tags=()
for tag in CostCenter CreatedBy Environment BusinessUnit ManagementTeam; do
  if ! echo "$ALL_TF_CONTENT" | grep -q "$tag"; then
    missing_tags+=("$tag")
  fi
done
if [[ ${#missing_tags[@]} -eq 0 ]]; then
  tags="true"
  tags_detail="all required tags present"
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

# ── Score ──────────────────────────────────────────────────────────────────────
score=0
for val in "$validate" "$naming" "$tags" "$secrets" "$networking" "$modules"; do
  [[ "$val" == "true" ]] && ((score++)) || true
done

# ── Write JSON ─────────────────────────────────────────────────────────────────
cat > "$SCORE_FILE" <<JSON
{
  "score": $score,
  "max": 6,
  "checks": {
    "validate":   { "pass": $validate,   "detail": "$validate_detail" },
    "naming":     { "pass": $naming,     "detail": "$naming_detail" },
    "tags":       { "pass": $tags,       "detail": "$tags_detail" },
    "secrets":    { "pass": $secrets,    "detail": "$secrets_detail" },
    "networking": { "pass": $networking, "detail": "$networking_detail" },
    "modules":    { "pass": $modules,    "detail": "$modules_detail" }
  }
}
JSON

echo "Score: $score/6  →  $SCORE_FILE"
cat "$SCORE_FILE"
