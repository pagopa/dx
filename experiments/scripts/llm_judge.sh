#!/usr/bin/env bash
# llm_judge.sh <output_dir> <llm_score_out.json> [model]
# LLM-as-a-judge: evaluates generated Terraform code on 4 dimensions (0-10 each).
# All 4 dimensions are scored in a SINGLE copilot call to minimise rate-limit usage.
# Requires: copilot CLI in PATH.
# Exits 0 always; writes results to llm_score_out.json.
set -euo pipefail

OUTPUT_DIR="${1:-}"
LLM_SCORE_FILE="${2:-$(dirname "$OUTPUT_DIR")/llm_score.json}"
MODEL="${3:-gpt-5.1-codex-mini}"

if [[ -z "$OUTPUT_DIR" || ! -d "$OUTPUT_DIR" ]]; then
  echo "Usage: $0 <output_dir> [llm_score_out.json] [model]" >&2
  exit 1
fi

# Gather all TF content into a single string (truncated for token budget)
TF_CONTENT=""
for f in "$OUTPUT_DIR"/*.tf; do
  [[ -f "$f" ]] || continue
  TF_CONTENT+="### $(basename "$f") ###"$'\n'
  TF_CONTENT+=$(head -200 "$f")
  TF_CONTENT+=$'\n\n'
done

if [[ -z "$TF_CONTENT" ]]; then
  echo "No .tf files found in $OUTPUT_DIR — writing zero scores."
  python3 -c "
import json
result = {
  'llm_score': 0,
  'llm_max': 40,
  'dimensions': {
    'completeness':  {'score': 0, 'max': 10, 'reasoning': 'no .tf files found'},
    'security':       {'score': 0, 'max': 10, 'reasoning': 'no .tf files found'},
    'code_quality':   {'score': 0, 'max': 10, 'reasoning': 'no .tf files found'},
    'dx_adherence':   {'score': 0, 'max': 10, 'reasoning': 'no .tf files found'},
  }
}
print(json.dumps(result, indent=2))
" > "$LLM_SCORE_FILE"
  exit 0
fi

# Shared context block injected into every judge prompt
CONTEXT_BLOCK="
You are a senior Terraform engineer at PagoPA DX, reviewing automatically generated Terraform infrastructure code.

The task that was given to the model was:
Generate a root Terraform module for an Azure project with:
- Function App (Node.js 20 runtime)
- Storage Account (for Function App and artifacts)
- Cosmos DB (NoSQL API, serverless)

DX mandatory requirements (from https://dx.pagopa.it/docs/terraform/):
- Naming: use provider::dx::resource_name() from pagopa-dx/azure provider for ALL resource names;
  define a naming_config local with exactly 6 fields: prefix, env_short, location, domain, app_name, instance_number
- Tags (all 6 required in locals.tf): CostCenter, CreatedBy="Terraform", Environment, BusinessUnit, Source (github URL), ManagementTeam;
  always pass local.tags to every resource and module — never hardcode tags inline
- Modules: use pagopa-dx/* modules from Terraform Registry (format: pagopa-dx/<name>/azurerm) with ~> version pin;
  NEVER use github.com/pagopa as module source; prefer DX modules over raw azurerm_* resources when available
- Providers: declare hashicorp/azurerm ~> 4.0 AND pagopa-dx/azure ~> 0.0 in required_providers;
  set storage_use_azuread = true in the azurerm provider block for AAD-only storage auth
- Secrets: zero hardcoded values; reference secrets via azurerm_key_vault_secret data source or @Microsoft.KeyVault() app setting references
- Networking: use dx_available_subnet_cidr resource for every new subnet to auto-allocate non-overlapping CIDRs
- File structure: exactly main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf;
  group outputs in objects (not flat, not nested resource name); every variable must have description + validation
- Code style: prefer for_each over count with lists; use try() for optional attrs; define use_cases map in locals.tf

Here is the generated code to evaluate:

$TF_CONTENT
"

# ── Single combined judge call (all 4 dimensions at once) ────────────────────
echo "[LLM Judge] Evaluating all 4 dimensions in a single call (model: $MODEL)..."

COMBINED_PROMPT="${CONTEXT_BLOCK}

---

Evaluate the code above across ALL 4 dimensions simultaneously.

For each dimension, assign an integer score 0-10 and a one-sentence reasoning:
- completeness: All 3 required services fully implemented: Function App (Node.js 20, linux runtime), Storage Account, Cosmos DB (serverless, NoSQL API). No stubs, no placeholders, all wired together.
- security: Private endpoints for Storage and Cosmos, managed identity (not service principal passwords), storage_use_azuread=true declared, no public_network_access_enabled=true, RBAC role assignments, Key Vault for all secret values.
- code_quality: for_each preferred over count-with-lists, try() used for optional attrs, locals.tf has naming_config with all 6 fields + use_cases map, outputs grouped in objects (not flat keys), all variables have description and validation, versions.tf present and separate from providers.tf.
- dx_adherence: provider::dx::resource_name() used for EVERY resource name (not just some), naming_config passed to all resource_name() calls, all 6 required tags present with CreatedBy="Terraform" and Source pointing to github.com/pagopa, DX Registry modules used (pagopa-dx/* format) for all supported services instead of raw azurerm_*, no github.com module sources, pagopa-dx/azure provider declared with ~> 0.0.

Return ONLY a single valid JSON object — no markdown, no text outside the JSON:
{\"completeness\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"security\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"code_quality\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"dx_adherence\": {\"score\": <int>, \"reasoning\": \"<sentence>\"}}"

_RAW_TMP=$(mktemp)
echo "$COMBINED_PROMPT" | copilot \
  --model "$MODEL" \
  --allow-all \
  --silent \
  > "$_RAW_TMP" 2>/dev/null || true

# Parse combined JSON and write llm_score.json
export _LLM_RAW_FILE="$_RAW_TMP"
export _LLM_SCORE_FILE="$LLM_SCORE_FILE"
python3 - <<'PYEOF'
import json, re, sys, os

text = open(os.environ["_LLM_RAW_FILE"]).read()

# Strip markdown fences if present (model often wraps output in ```json ... ```)
text_clean = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
text_clean = re.sub(r'```\s*$', '', text_clean.strip(), flags=re.MULTILINE).strip()

dims_parsed = {}
# Find the outermost JSON object using a stack-based approach
def extract_json_object(s):
    start = s.find('{')
    if start == -1:
        return None
    depth = 0
    for i, c in enumerate(s[start:], start):
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        if depth == 0:
            return s[start:i+1]
    return None

raw_obj = extract_json_object(text_clean)
if raw_obj:
    try:
        obj = json.loads(raw_obj)
        for dim in ("completeness", "security", "code_quality", "dx_adherence"):
            entry = obj.get(dim, {})
            dims_parsed[dim] = {
                "score": max(0, min(10, int(entry.get("score", 0)))),
                "reasoning": str(entry.get("reasoning", "no reasoning"))[:300],
            }
    except Exception as e:
        pass

if not dims_parsed:
    for dim in ("completeness", "security", "code_quality", "dx_adherence"):
        dims_parsed[dim] = {"score": 0, "reasoning": f"parse error — raw: {text[:120]}"}

total = sum(d["score"] for d in dims_parsed.values())
result = {
    "llm_score": total,
    "llm_max": 40,
    "dimensions": {k: {"score": v["score"], "max": 10, "reasoning": v["reasoning"]} for k, v in dims_parsed.items()},
}

with open(os.environ["_LLM_SCORE_FILE"], "w") as f:
    json.dump(result, f, indent=2)

score_file = os.environ["_LLM_SCORE_FILE"]
print(f"LLM Score: {total}/40  ->  {score_file}")
for k, v in dims_parsed.items():
    print(f"  {k:<20} {v['score']:>2}/10  {v['reasoning'][:80]}")
PYEOF

rm -f "$_RAW_TMP"
