#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Infrastructure Health Check
#
# Auto-generated verification script for the deployed Azure infrastructure.
# Runs Azure CLI commands to confirm that resources exist, are healthy,
# and can communicate with each other as expected.
#
# Usage:
#   chmod +x healthcheck.sh
#   ./healthcheck.sh
#
# Prerequisites:
#   - Azure CLI installed and authenticated (`az login`)
#   - Correct subscription selected (`az account set -s <id>`)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
# These values should be filled in by the agent based on the Terraform outputs
# or the user's environment.

SUBSCRIPTION_ID="${SUBSCRIPTION_ID:?Set SUBSCRIPTION_ID}"
RESOURCE_GROUP="${RESOURCE_GROUP:?Set RESOURCE_GROUP}"

# Uncomment and set the variables relevant to your deployment:
# CONTAINER_APP_NAME=""
# CONTAINER_APP_ENV_NAME=""
# HEALTH_PATH="/api/health"
# CUSTOM_DOMAIN=""
# DNS_ZONE_NAME=""
# DNS_RESOURCE_GROUP=""
# SUBDOMAIN=""
# KEY_VAULT_NAME=""
# KV_RESOURCE_GROUP=""
# IDENTITY_PRINCIPAL_ID=""
# SECRET_NAME=""
# PG_SERVER_NAME=""
# DNS_RESOURCE_GROUP=""
# COSMOS_ACCOUNT_NAME=""
# STORAGE_ACCOUNT_NAME=""
# FUNCTION_APP_NAME=""
# SB_NAMESPACE_NAME=""
# EH_NAMESPACE_NAME=""
# FRONTDOOR_PROFILE_NAME=""
# ENDPOINT_NAME=""

# ── Helpers ──────────────────────────────────────────────────────────────────

PASS=0
FAIL=0
SKIP=0

check() {
  local name="$1"
  local condition="$2"
  local message="${3:-}"

  if eval "$condition" >/dev/null 2>&1; then
    echo "  ✅ ${name}"
    ((PASS++))
  else
    echo "  ❌ ${name}"
    [[ -n "$message" ]] && echo "     → ${message}"
    ((FAIL++))
  fi
}

skip() {
  local name="$1"
  echo "  ⏭️  ${name} (skipped — not configured)"
  ((SKIP++))
}

section() {
  echo ""
  echo "━━━ $1 ━━━"
}

# ── Checks ───────────────────────────────────────────────────────────────────
# The agent should uncomment/add the sections relevant to the deployment.

echo "🏥 Infrastructure Health Check"
echo "   Resource Group: ${RESOURCE_GROUP}"
echo "   Subscription:   ${SUBSCRIPTION_ID}"

# ── Container App ────────────────────────────────────────────────────────────
# section "Container App: ${CONTAINER_APP_NAME}"
#
# state=$(az containerapp show --name "$CONTAINER_APP_NAME" -g "$RESOURCE_GROUP" \
#   --query "properties.provisioningState" -o tsv 2>/dev/null || echo "NOT_FOUND")
#
# check "Provisioning state is Succeeded" '[[ "$state" == "Succeeded" ]]' \
#   "Current state: ${state}. Check deployment logs."
#
# running=$(az containerapp show --name "$CONTAINER_APP_NAME" -g "$RESOURCE_GROUP" \
#   --query "properties.runningStatus" -o tsv 2>/dev/null || echo "Unknown")
#
# check "Running status is Running" '[[ "$running" == "Running" ]]' \
#   "Current status: ${running}. Check container logs with: az containerapp logs show"

# ── Public Reachability ──────────────────────────────────────────────────────
# fqdn=$(az containerapp show --name "$CONTAINER_APP_NAME" -g "$RESOURCE_GROUP" \
#   --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null)
#
# http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${fqdn}${HEALTH_PATH}" 2>/dev/null || echo "000")
#
# check "Health endpoint responds (${HEALTH_PATH})" '[[ "$http_code" == "200" || "$http_code" == "302" ]]' \
#   "Got HTTP ${http_code}. If 302, authentication may be redirecting. If 000, app is unreachable."

# ── Custom Domain ────────────────────────────────────────────────────────────
# section "Custom Domain: ${CUSTOM_DOMAIN}"
#
# cname=$(az network dns record-set cname show --zone-name "$DNS_ZONE_NAME" \
#   -g "$DNS_RESOURCE_GROUP" -n "$SUBDOMAIN" \
#   --query "cnameRecord.cname" -o tsv 2>/dev/null || echo "NOT_FOUND")
#
# check "CNAME record exists" '[[ "$cname" != "NOT_FOUND" ]]' \
#   "Create CNAME: ${SUBDOMAIN}.${DNS_ZONE_NAME} → container app FQDN"
#
# cert_state=$(az containerapp env certificate list \
#   --name "$CONTAINER_APP_ENV_NAME" -g "$RESOURCE_GROUP" \
#   --query "[?properties.subjectName=='${CUSTOM_DOMAIN}'].properties.provisioningState" \
#   -o tsv 2>/dev/null || echo "NOT_FOUND")
#
# check "Managed certificate provisioned" '[[ "$cert_state" == "Succeeded" ]]' \
#   "Certificate state: ${cert_state}. May take up to 15 minutes after DNS propagation."

# ── Key Vault Access ─────────────────────────────────────────────────────────
# section "Key Vault: ${KEY_VAULT_NAME}"
#
# secret_ok=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" \
#   --name "$SECRET_NAME" --query "id" -o tsv 2>/dev/null && echo "yes" || echo "no")
#
# check "Secret '${SECRET_NAME}' exists" '[[ "$secret_ok" == "yes" ]]' \
#   "Secret not found. Verify terraform applied the azurerm_key_vault_secret resource."
#
# role_ok=$(az role assignment list --assignee "$IDENTITY_PRINCIPAL_ID" \
#   --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${KV_RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT_NAME}" \
#   --query "[?roleDefinitionName=='Key Vault Secrets User'].id" -o tsv 2>/dev/null)
#
# check "Identity has Key Vault Secrets User role" '[[ -n "$role_ok" ]]' \
#   "Missing role assignment. Add azure_role_assignments with key_vault secrets = reader."

# ── PostgreSQL ───────────────────────────────────────────────────────────────
# section "PostgreSQL: ${PG_SERVER_NAME}"
#
# pg_state=$(az postgres flexible-server show --name "$PG_SERVER_NAME" -g "$RESOURCE_GROUP" \
#   --query "state" -o tsv 2>/dev/null || echo "NOT_FOUND")
#
# check "Server state is Ready" '[[ "$pg_state" == "Ready" ]]' \
#   "Current state: ${pg_state}."
#
# pep_status=$(az network private-endpoint list -g "$RESOURCE_GROUP" \
#   --query "[?contains(name,'${PG_SERVER_NAME}')].privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" \
#   -o tsv 2>/dev/null || echo "NOT_FOUND")
#
# check "Private endpoint is Approved" '[[ "$pep_status" == "Approved" ]]' \
#   "Private endpoint status: ${pep_status}. Check subnet_pep_id and DNS zone configuration."

# ── Results ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━ Results ━━━"
echo "  ✅ Passed:  ${PASS}"
echo "  ❌ Failed:  ${FAIL}"
echo "  ⏭️  Skipped: ${SKIP}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "⚠️  ${FAIL} check(s) failed. Review the messages above for remediation steps."
  exit 1
else
  echo "🎉 All checks passed!"
  exit 0
fi
