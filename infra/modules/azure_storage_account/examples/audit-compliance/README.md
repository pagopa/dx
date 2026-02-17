# Audit Compliance Example

This example demonstrates how to configure the Azure Storage Account module for full audit log compliance with SEC 17a-4(f) requirements, including legal hold capabilities.

## Basic Audit Configuration

```hcl
module "audit_storage" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment = {
    prefix          = "myorg"
    env_short       = "p"
    location        = "italynorth"
    domain          = "security"
    app_name        = "audit"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.audit.name
  use_case            = "audit"           # Automatically applies compliance settings
  secondary_location  = "westeurope"       # Required for geo-redundancy
  subnet_pep_id       = azurerm_subnet.pep.id

  # MANDATORY: Customer-Managed Keys for enhanced encryption
  customer_managed_key = {
    enabled      = true
    type         = "kv"
    key_vault_id = azurerm_key_vault.security.id
  }

  # MANDATORY: Diagnostic settings for access logging
  diagnostic_settings = {
    enabled                    = true
    log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id
  }

  # RECOMMENDED: PagoPA standard is 12 months (365 days)
  audit_retention_days = 365

  tags = {
    Purpose    = "AuditLogs"
    Compliance = "GDPR-NIS2-SEC17a4f"
  }
}
```

**What gets automatically configured:**

- ✅ Immutability policy enabled (created as **Unlocked** - must lock post-deployment for SEC 17a-4(f))
- ✅ TLS 1.2 minimum + HTTPS-only
- ✅ Infrastructure encryption (double encryption)
- ✅ OAuth authentication default
- ✅ Cross-tenant replication disabled
- ✅ Blob versioning and change feed enabled
- ✅ Secondary geo-redundant replica
- ✅ Lifecycle management (Hot→Cool→Cold→Delete)

**Post-Deployment Steps for Full Compliance:**

After Terraform deployment, lock the immutability policy using Azure CLI:

```bash
# Lock the policy (IRREVERSIBLE - do this only after validation!)
az storage account immutability-policy update \
  --account-name <storage-account-name> \
  --resource-group <resource-group-name> \
  --state Locked

# Verify
az storage account show \
  --name <storage-account-name> \
  --query "immutableStorageWithVersioning.immutabilityPolicy.state"
# Should return: "Locked"
```

## Advanced: Container-Level Legal Hold

For scenarios requiring litigation hold or investigation capabilities:

```hcl
module "audit_storage_with_legal_hold" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  # ... basic configuration same as above ...

  containers = [
    {
      name        = "audit-logs"
      access_type = "private"
      # Standard audit logs with account-level immutability
    },
    {
      name        = "investigation-logs"
      access_type = "private"
      # Container with legal hold capability
      immutability_policy = {
        period_in_days  = 730  # 2 years base retention
        locked          = false # Keep unlocked to allow legal hold tag changes
      }
    },
    {
      name        = "compliance-archive"
      access_type = "private"
      # Permanently locked for regulatory compliance
      immutability_policy = {
        period_in_days  = 2555  # 7 years
        locked          = true   # Locked = cannot be deleted, SEC 17a-4(f) compliant
      }
    }
  ]
}
```

## Legal Hold Tag Requirements

- **Quantity**: 1-10 tags per container
- **Format**: Alphanumeric only (a-z, A-Z, 0-9)
- **Length**: 3-23 characters each
- **Examples**:
  - ✅ Valid: `case2024`, `litigation`, `subpoena123`, `investigation`
  - ❌ Invalid: `case-2024` (hyphen), `ab` (too short), `this-is-a-very-long-tag-name-123` (too long)

## Managing Legal Holds at Runtime

### Adding Legal Hold

```bash
# Add legal hold tags to a container
az storage container legal-hold set \
  --account-name <storage-account-name> \
  --container-name investigation-logs \
  --tags "case2024" "litigation" "subpoena456"
```

### Removing Legal Hold

```bash
# Remove legal hold tags (all tags must be cleared)
az storage container legal-hold clear \
  --account-name <storage-account-name> \
  --container-name investigation-logs \
  --tags "case2024" "litigation" "subpoena456"
```

### Checking Legal Hold Status

```bash
# View current legal hold tags
az storage container legal-hold show \
  --account-name <storage-account-name> \
  --container-name investigation-logs
```

## Unlocked vs Locked Policy Comparison

| Feature                      | Unlocked                | Locked                             |
| ---------------------------- | ----------------------- | ---------------------------------- |
| **Modify retention period**  | ✅ Increase or decrease | ⚠️ Can only increase (max 5 times) |
| **Delete policy**            | ✅ Yes                  | ❌ Never (irreversible)            |
| **SEC 17a-4(f) compliance**  | ❌ No                   | ✅ Yes                             |
| **Prevent account deletion** | ❌ No                   | ✅ Yes                             |
| **Legal hold modifications** | ✅ Yes                  | ❌ No                              |
| **Use case**                 | Testing, validation     | Production compliance              |

## Compliance Validation Checklist

After deployment, verify:

```bash
# 1. Check immutability policy state
az storage account show \
  --name <storage-account-name> \
  --query "immutableStorageWithVersioning.immutabilityPolicy.state"
# Expected: "Locked" for audit tier

# 2. Verify encryption settings
az storage account show \
  --name <storage-account-name> \
  --query "{tls: minimumTlsVersion, https: enableHttpsTrafficOnly, infraEncrypt: encryption.requireInfrastructureEncryption}"
# Expected: TLS1_2, true, true

# 3. Check diagnostic settings
az monitor diagnostic-settings list \
  --resource $(az storage account show --name <storage-account-name> --query id -o tsv)
# Expected: At least 1 diagnostic setting with Log Analytics workspace

# 4. Verify blob versioning
az storage account blob-service-properties show \
  --account-name <storage-account-name> \
  --query "isVersioningEnabled"
# Expected: true

# 5. Check secondary replica
az storage account show \
  --name <secondary-replica-name> \
  --query "{location: location, replication: accountReplicationType}"
# Expected: Different location, LRS replication
```

## Locking Immutability Policies

⚠️ **WARNING**: Locking an immutability policy is **IRREVERSIBLE**.

⚠️ **Azure Limitation**: Terraform cannot create storage accounts with "Locked" immutability policies. Policies are always created as "Unlocked" and must be locked post-deployment via Azure CLI or Portal.

To lock an immutability policy for SEC 17a-4(f) compliance:

1. **Test thoroughly in non-production** first
2. **Verify retention period** is correct (cannot be shortened after locking)
3. **Ensure no legal holds** are active on containers (must be cleared before locking account-level policy)
4. **Deploy with Terraform** (policy will be Unlocked)
5. **Lock via Azure CLI**:

```bash
# Lock the account-level immutability policy
az storage account immutability-policy update \
  --account-name <storage-account-name> \
  --resource-group <resource-group-name> \
  --state Locked

# For container-level policies, lock each container
az storage container immutability-policy lock \
  --account-name <storage-account-name> \
  --container-name <container-name>
```

6. **Verify locking**:

```bash
az storage account show \
  --name <storage-account-name> \
  --query "immutableStorageWithVersioning.immutabilityPolicy.state"
# Should return: "Locked"
```

7. **Align terraform configuration** to reflect locked state (update individual container `immutability_policy.locked` value)

## Best Practices

1. **Start with unlocked** for testing and validation
2. **Lock only when confident** - it's permanent
3. **Use container-level policies** for legal hold flexibility
4. **Keep legal hold tags unlocked** - separate compliance (locked) from investigation (unlocked) containers
5. **Monitor with alerts** - set up Azure Monitor alerts for policy changes
6. **Document legal holds** - maintain external records of why legal holds were placed
7. **Regular compliance audits** - verify policies are still active and correct
8. **Backup legal hold tags** - keep a record of active legal holds outside Azure

## Troubleshooting

### Cannot delete storage account

**Cause**: Locked immutability policy or active legal holds
**Solution**:

1. Check policy state: `az storage account show --name <name> --query "immutableStorageWithVersioning.immutabilityPolicy.state"`
2. If "Locked", the account cannot be deleted until all data expires
3. Check legal holds: `az storage container legal-hold show --account-name <name> --container-name <container>`
4. Clear legal holds if present, then wait for retention period to expire

### Cannot modify container policy

**Cause**: Policy is locked or legal hold is active
**Solution**:

- For locked policies: Can only extend retention, never shorten or delete
- For legal holds: Clear all legal hold tags first

### Legal hold tags not accepted

**Cause**: Invalid tag format
**Solution**: Ensure tags are:

- 3-23 characters
- Alphanumeric only (no special characters)
- Maximum 10 tags per container

## References

- [Azure Immutable Storage Overview](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [SEC 17a-4(f) Compliance](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-sec-17a-4)
- [GDPR Compliance in Azure](https://learn.microsoft.com/en-us/azure/compliance/offerings/offering-gdpr)
- [NIS2 Directive Compliance](https://www.enisa.europa.eu/topics/cybersecurity-policy/nis-directive-new)

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_storage_account"></a> [azure\_storage\_account](#module\_azure\_storage\_account) | pagopa-dx/azure-storage-account/azurerm | ~> 2.1 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_log_analytics_workspace.law](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/log_analytics_workspace) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
