# Health Check Patterns

Azure CLI commands to verify that deployed infrastructure works correctly.
Each pattern tests a specific **capability** — the agent selects which patterns
to include based on the user's configuration.

## Prerequisites

All commands assume:

```bash
# Authenticate and set subscription
az login
az account set --subscription "$SUBSCRIPTION_ID"
```

## Patterns

### 1. Container App — Running and Healthy

**When**: Any Container App deployment

```bash
# Verify the container app exists and is in Running state
provisioning_state=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.provisioningState" -o tsv)

running_status=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.runningStatus" -o tsv)

# Verify at least one replica is active
replica_count=$(az containerapp replica list \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "length(@)" -o tsv 2>/dev/null || echo "0")
```

**Expected**: `provisioning_state=Succeeded`, `running_status=Running`, `replica_count >= 1`

---

### 2. Container App — Public Reachability

**When**: `public_access_enabled = true`

```bash
# Get the FQDN
fqdn=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# Hit the health endpoint
http_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${fqdn}${HEALTH_PATH}")
```

**Expected**: `http_status=200` (or `302` if authentication is enabled — redirect to login)

---

### 3. Custom Domain — DNS Resolution

**When**: `custom_domain` is configured

```bash
# Verify CNAME record exists
cname_target=$(az network dns record-set cname show \
  --zone-name "$DNS_ZONE_NAME" \
  --resource-group "$DNS_RESOURCE_GROUP" \
  --name "$SUBDOMAIN" \
  --query "cnameRecord.cname" -o tsv 2>/dev/null)

# Verify TXT validation record
txt_value=$(az network dns record-set txt show \
  --zone-name "$DNS_ZONE_NAME" \
  --resource-group "$DNS_RESOURCE_GROUP" \
  --name "asuid.${SUBDOMAIN}" \
  --query "txtRecords[0].value[0]" -o tsv 2>/dev/null)

# Verify the custom domain binding
domain_status=$(az containerapp hostname list \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='${CUSTOM_DOMAIN}'].bindingType" -o tsv)

# Verify managed certificate
cert_state=$(az containerapp env certificate list \
  --name "$CONTAINER_APP_ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?properties.subjectName=='${CUSTOM_DOMAIN}'].properties.provisioningState" -o tsv 2>/dev/null)
```

**Expected**: `cname_target` points to container app FQDN, `txt_value` matches domain verification ID, `domain_status=SniEnabled`, `cert_state=Succeeded`

---

### 4. Key Vault — Secret Readable by Identity

**When**: Application reads secrets from Key Vault

```bash
# Verify the secret exists
secret_exists=$(az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "$SECRET_NAME" \
  --query "id" -o tsv 2>/dev/null && echo "yes" || echo "no")

# Verify the managed identity has the correct role assignment
role_assigned=$(az role assignment list \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${KV_RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT_NAME}" \
  --query "[?roleDefinitionName=='Key Vault Secrets User' || roleDefinitionName=='Key Vault Secrets Officer'].principalId" -o tsv)
```

**Expected**: `secret_exists=yes`, `role_assigned` is not empty

---

### 5. PostgreSQL — Server Accessible via Private Endpoint

**When**: `azure_postgres_server` module is used

```bash
# Verify the server exists and is ready
pg_state=$(az postgres flexible-server show \
  --name "$PG_SERVER_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "state" -o tsv)

# Verify private endpoint exists
pep_status=$(az network private-endpoint show \
  --name "${PG_SERVER_NAME}-pep" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv 2>/dev/null)

# Verify private DNS zone has A record for the server
dns_record=$(az network private-dns record-set a show \
  --zone-name "privatelink.postgres.database.azure.com" \
  --resource-group "$DNS_RESOURCE_GROUP" \
  --name "$PG_SERVER_NAME" \
  --query "aRecords[0].ipv4Address" -o tsv 2>/dev/null)

# Verify admin password is in Key Vault (if module manages it)
kv_secret=$(az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "${PG_SERVER_NAME}-admin-password" \
  --query "id" -o tsv 2>/dev/null && echo "yes" || echo "no")
```

**Expected**: `pg_state=Ready`, `pep_status=Approved`, `dns_record` is a private IP, `kv_secret=yes`

---

### 6. Cosmos DB — Account and Network Access

**When**: `azure_cosmos_account` module is used

```bash
# Verify account exists and is online
cosmos_status=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "provisioningState" -o tsv)

# Verify public network access is disabled (if private)
public_access=$(az cosmosdb show \
  --name "$COSMOS_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "publicNetworkAccess" -o tsv)

# Verify private endpoint
pep_status=$(az network private-endpoint show \
  --name "${COSMOS_ACCOUNT_NAME}-sql-pep" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv 2>/dev/null)
```

**Expected**: `cosmos_status=Succeeded`, `public_access=Disabled` (if private), `pep_status=Approved`

---

### 7. Entra ID Authentication — EasyAuth Configured

**When**: `authentication` block is configured on Container App

```bash
# Verify auth is enabled
auth_enabled=$(az containerapp auth show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.platform.enabled" -o tsv 2>/dev/null)

# Verify identity provider
identity_provider=$(az containerapp auth show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.identityProviders.azureActiveDirectory.registration.clientId" -o tsv 2>/dev/null)

# Test: unauthenticated request should get 302 redirect
fqdn=$(az containerapp show \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
redirect_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${fqdn}/")
```

**Expected**: `auth_enabled=true`, `identity_provider` matches client_id, `redirect_status=302`

---

### 8. Storage Account — Exists and Properly Secured

**When**: `azure_storage_account` module is used

```bash
# Verify account exists
sa_status=$(az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "provisioningState" -o tsv)

# Verify TLS 1.2
min_tls=$(az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "minimumTlsVersion" -o tsv)

# Verify HTTPS only
https_only=$(az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "enableHttpsTrafficOnly" -o tsv)

# Verify public access (should be disabled for private mode)
public_access=$(az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "publicNetworkAccess" -o tsv)
```

**Expected**: `sa_status=Succeeded`, `min_tls=TLS1_2`, `https_only=true`, `public_access=Disabled` (if private)

---

### 9. Function App — Running with Correct Runtime

**When**: `azure_function_app` or `azure_function_app_exposed` is used

```bash
# Verify the function app exists and is running
fa_state=$(az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "state" -o tsv)

# Verify runtime stack
runtime=$(az functionapp config show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "linuxFxVersion" -o tsv)

# Verify health endpoint
fa_hostname=$(az functionapp show \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostName" -o tsv)
health_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${fa_hostname}${HEALTH_PATH}" 2>/dev/null)
```

**Expected**: `fa_state=Running`, `runtime` contains expected stack, `health_status=200`

---

### 10. Role Assignment — Identity Has Required Permissions

**When**: `azure_role_assignments` module is used (always verify this!)

```bash
# List all role assignments for a principal on a specific scope
assignments=$(az role assignment list \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --scope "$RESOURCE_ID" \
  --query "[].{role: roleDefinitionName, scope: scope}" -o table)

# Verify a specific role exists
has_role=$(az role assignment list \
  --assignee "$IDENTITY_PRINCIPAL_ID" \
  --scope "$RESOURCE_ID" \
  --query "[?roleDefinitionName=='${EXPECTED_ROLE}'].id" -o tsv)
```

**Expected**: `has_role` is not empty

---

### 11. Service Bus — Namespace and Private Endpoint

**When**: `azure_service_bus_namespace` is used

```bash
sb_status=$(az servicebus namespace show \
  --name "$SB_NAMESPACE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "provisioningState" -o tsv)

pep_status=$(az network private-endpoint show \
  --name "${SB_NAMESPACE_NAME}-pep" \
  --resource-group "$RESOURCE_GROUP" \
  --query "privateLinkServiceConnections[0].privateLinkServiceConnectionState.status" -o tsv 2>/dev/null)
```

**Expected**: `sb_status=Succeeded`, `pep_status=Approved`

---

### 12. Event Hub — Namespace and Hubs

**When**: `azure_event_hub` is used

```bash
eh_status=$(az eventhubs namespace show \
  --name "$EH_NAMESPACE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "provisioningState" -o tsv)

hub_count=$(az eventhubs eventhub list \
  --namespace-name "$EH_NAMESPACE_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "length(@)" -o tsv)
```

**Expected**: `eh_status=Succeeded`, `hub_count` matches expected number

---

### 13. CDN / Front Door — Endpoint Reachable

**When**: `azure_cdn` module is used

```bash
endpoint_status=$(az afd endpoint show \
  --profile-name "$FRONTDOOR_PROFILE_NAME" \
  --endpoint-name "$ENDPOINT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "provisioningState" -o tsv)

endpoint_hostname=$(az afd endpoint show \
  --profile-name "$FRONTDOOR_PROFILE_NAME" \
  --endpoint-name "$ENDPOINT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "hostName" -o tsv)

http_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${endpoint_hostname}/")
```

**Expected**: `endpoint_status=Succeeded`, `http_status=200`
