#!/usr/bin/env python3
"""
registry_check.py <tf_file>
Checks DX module coverage and version pins against the Terraform Registry.
Outputs a single tab-separated line: coverage module_version coverage_detail version_detail
"""
import sys, re, json, urllib.request

tf = open(sys.argv[1]).read() if len(sys.argv) > 1 else ""

# ── Fetch all pagopa-dx modules from Registry ──────────────────────────────
try:
    url = "https://registry.terraform.io/v1/modules?namespace=pagopa-dx&limit=100"
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read())
    registry_modules = {m["name"]: m["version"] for m in data.get("modules", [])}
except Exception:
    # Fallback: known modules at last check
    registry_modules = {
        "azure-function-app":    "4.2.0",
        "azure-storage-account": "2.1.3",
        "azure-cosmos-account":  "0.4.0",
        "azure-app-service":     "3.1.0",
        "azure-postgres-server": "2.0.0",
        "azure-container-app":   "1.0.0",
        "azure-role-assignments": "1.0.0",
    }

# ── Map DX module slug → raw azurerm resource pattern ─────────────────────
DX_TO_RAW = {
    "azure-function-app":    r'resource\s+"azurerm_(linux|windows)_?function_app"',
    "azure-storage-account": r'resource\s+"azurerm_storage_account"',
    "azure-cosmos-account":  r'resource\s+"azurerm_cosmosdb_account"',
    "azure-app-service":     r'resource\s+"azurerm_(linux|windows)_web_app"',
    "azure-postgres-server": r'resource\s+"azurerm_postgresql_flexible_server"',
    "azure-container-app":   r'resource\s+"azurerm_container_app"',
}

# ── Task-required services ─────────────────────────────────────────────────
REQUIRED = ["azure-function-app", "azure-storage-account", "azure-cosmos-account"]

# ── Coverage check ─────────────────────────────────────────────────────────
missing_coverage = []
for mod in REQUIRED:
    has_dx  = bool(re.search(rf'source\s*=\s*"pagopa-dx/{mod}', tf))
    raw_pat = DX_TO_RAW.get(mod)
    has_raw = bool(re.search(raw_pat, tf)) if raw_pat else False
    if has_dx:
        pass
    elif has_raw:
        missing_coverage.append(f"{mod} (raw azurerm instead of DX module)")
    else:
        missing_coverage.append(f"{mod} (not implemented)")

coverage = "true" if not missing_coverage else "false"
coverage_detail = "all required services use DX modules" if not missing_coverage \
    else "raw azurerm or missing: " + ", ".join(missing_coverage)

# ── Version check ──────────────────────────────────────────────────────────
outdated = []
for mod_name, latest_ver in registry_modules.items():
    if not re.search(rf'source\s*=\s*"pagopa-dx/{mod_name}', tf):
        continue
    latest_major = int(latest_ver.split(".")[0])
    match = re.search(rf'pagopa-dx/{mod_name}.*?version\s*=\s*"~>\s*([0-9]+)', tf, re.DOTALL)
    if not match:
        block_match = re.findall(
            rf'(?:source\s*=\s*"pagopa-dx/{mod_name}"|version\s*=\s*"~>\s*([0-9]+))',
            tf
        )
        used_major = int(block_match[0]) if block_match and block_match[0].isdigit() else latest_major
    else:
        used_major = int(match.group(1))
    if used_major < latest_major:
        outdated.append(f"{mod_name} pinned ~>{used_major}.x but latest is {latest_major}.x ({latest_ver})")

mod_version = "true" if not outdated else "false"
mod_version_detail = "all DX module version pins match Registry latest" if not outdated \
    else "outdated pins: " + "; ".join(outdated)

print(coverage, mod_version, coverage_detail, mod_version_detail, sep="\t")
