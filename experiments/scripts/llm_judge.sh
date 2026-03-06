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
- Function App (Node.js runtime)
- Storage Account
- Cosmos DB

The Function App must be able to write and read from Cosmos DB, and only read from the Storage Account.
IAM/RBAC role assignments must reflect these permissions.

DX mandatory requirements (from https://dx.pagopa.it/docs/terraform/):
- Naming: use provider::dx::resource_name() from pagopa-dx/azure provider for ALL resource names;
  define a naming_config local with exactly 6 fields: prefix, env_short, location, domain, app_name, instance_number
- Tags (required in locals.tf): CostCenter, CreatedBy=\"Terraform\", Environment, BusinessUnit, ManagementTeam;
  always pass local.tags to every resource and module — never hardcode tags inline
- Modules: use pagopa-dx/* modules from Terraform Registry (format: pagopa-dx/<name>/azurerm) with ~> version pin;
  NEVER use github.com/pagopa as module source; prefer DX modules over raw azurerm_* resources when available
- Providers: declare hashicorp/azurerm ~> 4.0 AND pagopa-dx/azure ~> 0.0 in required_providers;
  set storage_use_azuread = true in the azurerm provider block for AAD-only storage auth
- Secrets: zero hardcoded values; reference secrets via azurerm_key_vault_secret data source or @Microsoft.KeyVault() app setting references
- File structure: exactly main.tf, variables.tf, outputs.tf, locals.tf, providers.tf, versions.tf;
  group outputs in objects (not flat); every variable must have description
- Code style: prefer for_each over count with lists; group outputs in objects

Here is the generated code to evaluate:

$TF_CONTENT
"

# ── Single combined judge call (all 4 dimensions at once) ────────────────────
echo "[LLM Judge] Evaluating all 4 dimensions in a single call (model: $MODEL)..."

COMBINED_PROMPT="${CONTEXT_BLOCK}

---

Evaluate the code above across ALL 4 dimensions simultaneously.

For each dimension, assign an integer score 0-10 and a one-sentence reasoning:
- completeness: All 3 required services fully implemented (Function App, Storage Account, Cosmos DB), wired with correct permissions (Function App can read+write Cosmos, read-only Storage). RBAC role assignments are coherent with these permissions. No stubs or placeholders.
- security: Managed identity used (not service principal passwords), no hardcoded secrets, Key Vault referenced for sensitive values, storage_use_azuread=true declared. Private endpoints are a bonus, not required.
- code_quality: Files separated (main, variables, outputs, locals, providers, versions), variables have description, outputs grouped in objects (not flat keys), naming_config local defined with all 6 fields, clean and readable code structure.
- dx_adherence: provider::dx::resource_name() used for EVERY resource name (not just some), naming_config passed to all resource_name() calls, required DX tags present with CreatedBy=\"Terraform\", DX Registry modules used (pagopa-dx/* format with ~> pin) for supported services, pagopa-dx/azure provider declared, no github.com module sources.

Return ONLY a single valid JSON object — no markdown, no text outside the JSON:
{\"completeness\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"security\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"code_quality\": {\"score\": <int>, \"reasoning\": \"<sentence>\"},
 \"dx_adherence\": {\"score\": <int>, \"reasoning\": \"<sentence>\"}}"

_RAW_TMP=$(mktemp)
_PROMPT_TMP=$(mktemp)
_ERR_TMP=$(mktemp)
echo "$COMBINED_PROMPT" > "$_PROMPT_TMP"

PROMPT_TEXT="$(cat "$_PROMPT_TMP")"
PROMPT_LEN=${#PROMPT_TEXT}
echo "[LLM Judge] Prompt length: ${PROMPT_LEN} chars"

# Use -p flag for non-interactive mode (copilot CLI ignores stdin).
# Timeout after 120s to avoid hanging.
if command -v gtimeout &>/dev/null; then
  TIMEOUT_CMD="gtimeout 120"
elif command -v timeout &>/dev/null; then
  TIMEOUT_CMD="timeout 120"
else
  TIMEOUT_CMD=""
fi

$TIMEOUT_CMD copilot \
  -p "$PROMPT_TEXT" \
  --model "$MODEL" \
  --silent \
  > "$_RAW_TMP" 2>"$_ERR_TMP" || true

rm -f "$_PROMPT_TMP"

# Log errors if any
if [[ -s "$_ERR_TMP" ]]; then
  echo "[LLM Judge] stderr from copilot:" >&2
  head -5 "$_ERR_TMP" >&2
fi
rm -f "$_ERR_TMP"

RAW_SIZE=$(wc -c < "$_RAW_TMP" | tr -d ' ')
echo "[LLM Judge] Raw response size: ${RAW_SIZE} bytes"

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
