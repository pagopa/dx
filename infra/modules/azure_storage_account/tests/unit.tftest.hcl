# Unit tests for azure_storage_account module.
# Uses mocked providers - no real infrastructure needed.
# Default variables use force_public_network_access_enabled=true to avoid
# for_each DNS zone data-source issues in the base scenarios.

variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "sa"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_storage_account/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Storage Account unit tests"
  }

  resource_group_name                 = "rg-test"
  force_public_network_access_enabled = true
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_subscription.current
  values = {
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "00000000-0000-0000-0000-000000000000"
  }
}

# ── 1. Security defaults ────────────────────────────────────────────────────
run "storage_account_security_defaults" {
  command = plan

  assert {
    condition     = azurerm_storage_account.this.min_tls_version == "TLS1_2"
    error_message = "min_tls_version must be TLS1_2"
  }

  assert {
    condition     = azurerm_storage_account.this.https_traffic_only_enabled == true
    error_message = "https_traffic_only_enabled must be true"
  }

  assert {
    condition     = azurerm_storage_account.this.cross_tenant_replication_enabled == false
    error_message = "cross_tenant_replication_enabled must be false"
  }

  assert {
    condition     = azurerm_storage_account.this.account_kind == "StorageV2"
    error_message = "account_kind must be StorageV2"
  }
}

# ── 2. Default use case ─────────────────────────────────────────────────────
run "storage_account_default_use_case" {
  command = plan

  assert {
    condition     = azurerm_storage_account.this.account_tier == "Standard"
    error_message = "account_tier must be Standard for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "account_replication_type must be ZRS for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == false
    error_message = "infrastructure_encryption_enabled must be false for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == true
    error_message = "shared_access_key_enabled must be true for default use case"
  }

  assert {
    condition     = azurerm_storage_account.this.default_to_oauth_authentication == false
    error_message = "default_to_oauth_authentication must be false for default use case"
  }
}

# ── 3. Development use case ─────────────────────────────────────────────────
run "storage_account_development_use_case" {
  command = plan

  variables {
    use_case = "development"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "LRS"
    error_message = "account_replication_type must be LRS for development use case"
  }

  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == false
    error_message = "infrastructure_encryption_enabled must be false for development use case"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.storage_account_health_check) == 0
    error_message = "alerts count must be 0 for development use case"
  }
}

# ── 4. Delegated access use case ────────────────────────────────────────────
run "storage_account_delegated_access_use_case" {
  command = plan

  variables {
    use_case = "delegated_access"
  }

  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == false
    error_message = "shared_access_key_enabled must be false for delegated_access use case"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "public_network_access_enabled must be true for delegated_access use case"
  }

  assert {
    condition     = length(azurerm_security_center_storage_defender.this) == 1
    error_message = "defender must be enabled for delegated_access use case"
  }
}

# ── 5. Audit use case ───────────────────────────────────────────────────────
run "storage_account_audit_use_case" {
  command = plan

  variables {
    use_case           = "audit"
    secondary_location = "westeurope"

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.KeyVault/vaults/kv-common"
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.OperationalInsights/workspaces/law-common"
    }
  }

  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == true
    error_message = "infrastructure_encryption_enabled must be true for audit use case"
  }

  assert {
    condition     = azurerm_storage_account.this.default_to_oauth_authentication == true
    error_message = "default_to_oauth_authentication must be true for audit use case"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "account_replication_type must be ZRS for audit use case"
  }

  assert {
    condition     = length(azurerm_storage_account.this.immutability_policy) > 0
    error_message = "immutability_policy must be present for audit use case"
  }

  assert {
    condition     = length(azurerm_storage_management_policy.lifecycle_audit) == 1
    error_message = "lifecycle_audit management policy must be created for audit use case"
  }

  assert {
    condition     = length(azurerm_storage_account.secondary_replica) == 1
    error_message = "secondary_replica must be created for audit use case"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.storage_account) == 1
    error_message = "diagnostic_setting must be created for audit use case"
  }
}

# ── 6. Archive use case ─────────────────────────────────────────────────────
run "storage_account_archive_use_case" {
  command = plan

  variables {
    use_case           = "archive"
    secondary_location = "westeurope"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "LRS"
    error_message = "account_replication_type must be LRS for archive use case"
  }

  assert {
    condition     = length(azurerm_storage_account.this.immutability_policy) > 0
    error_message = "immutability_policy must be present for archive use case"
  }

  assert {
    condition     = length(azurerm_storage_management_policy.lifecycle_archive) == 1
    error_message = "lifecycle_archive management policy must be created for archive use case"
  }

  assert {
    condition     = length(azurerm_storage_account.secondary_replica) == 1
    error_message = "secondary_replica must be created for archive use case"
  }
}

# ── 7. Public network mode ──────────────────────────────────────────────────
run "storage_account_public_network" {
  command = plan

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "public_network_access_enabled must be true when force_public=true"
  }

  assert {
    condition     = local.peps.create_subservices.blob == false
    error_message = "peps.create_subservices.blob must be false when public network is forced"
  }

  assert {
    condition     = length(azurerm_security_center_storage_defender.this) == 1
    error_message = "defender must be enabled when public network is forced"
  }
}

# ── 8. Private network mode ─────────────────────────────────────────────────
run "storage_account_private_network" {
  command = plan

  variables {
    force_public_network_access_enabled = false
    subnet_pep_id                       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-common/subnets/snet-pep"
  }

  override_data {
    target = data.azurerm_private_dns_zone.storage_account["blob"]
    values = {
      id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
      name = "privatelink.blob.core.windows.net"
    }
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == false
    error_message = "public_network_access_enabled must be false when force_public=false"
  }

  assert {
    condition     = local.peps.create_subservices.blob == true
    error_message = "peps.create_subservices.blob must be true for private mode with default subservices"
  }
}

# ── 9. Immutability forces versioning and change_feed ───────────────────────
run "storage_account_immutability_forces_versioning" {
  command = plan

  variables {
    blob_features = {
      immutability_policy = {
        enabled                       = true
        allow_protected_append_writes = true
        period_since_creation_in_days = 730
      }
    }
  }

  assert {
    condition     = azurerm_storage_account.this.blob_properties[0].versioning_enabled == true
    error_message = "versioning_enabled must be true when immutability policy is enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.blob_properties[0].change_feed_enabled == true
    error_message = "change_feed_enabled must be true when immutability policy is enabled"
  }
}

# ── 10. Blob retention policy ───────────────────────────────────────────────
run "storage_account_blob_retention" {
  command = plan

  variables {
    blob_features = {
      delete_retention_days = 30
    }
  }

  assert {
    condition     = azurerm_storage_account.this.blob_properties[0].delete_retention_policy[0].days == 30
    error_message = "delete_retention_policy days must be 30"
  }

  assert {
    condition     = length(azurerm_storage_account.this.blob_properties[0].restore_policy) == 0
    error_message = "restore_policy must be absent when restore_policy_days is 0"
  }
}

# ── 11. Containers, tables, and queues subresources ─────────────────────────
run "storage_account_containers_subresources" {
  command = plan

  variables {
    subservices_enabled = {
      blob  = true
      table = true
      queue = true
    }
    containers = [
      { name = "container1", access_type = "private" },
      { name = "container2", access_type = "private" }
    ]
    tables = ["table1", "table2"]
    queues = ["queue1", "queue2"]
  }

  assert {
    condition     = length(azurerm_storage_container.this) == 2
    error_message = "2 containers must be created"
  }

  assert {
    condition     = length(azurerm_storage_table.this) == 2
    error_message = "2 tables must be created"
  }

  assert {
    condition     = length(azurerm_storage_queue.this) == 2
    error_message = "2 queues must be created"
  }
}

# ── 12. Container-level immutability policy ─────────────────────────────────
run "storage_account_container_immutability" {
  command = plan

  variables {
    blob_features = {
      immutability_policy = {
        enabled = true
      }
    }
    containers = [
      {
        name        = "container-with-policy"
        access_type = "private"
        immutability_policy = {
          period_in_days = 365
          locked         = false
        }
      },
      {
        name        = "container-without-policy"
        access_type = "private"
      }
    ]
  }

  assert {
    condition     = length(azurerm_storage_container_immutability_policy.this) == 1
    error_message = "container_immutability_policy must be created only for containers with a policy defined"
  }
}

# ── 13. Alerts created for default use case ─────────────────────────────────
run "storage_account_alerts_created" {
  command = plan

  assert {
    condition     = length(azurerm_monitor_metric_alert.storage_account_health_check) == 1
    error_message = "alert health_check must be created for default use case"
  }
}

# ── 14. No alerts for development use case ──────────────────────────────────
run "storage_account_no_alerts_development" {
  command = plan

  variables {
    use_case = "development"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.storage_account_health_check) == 0
    error_message = "no alerts must be created for development use case"
  }
}

# ── 15. CMK with system-assigned identity ───────────────────────────────────
run "storage_account_cmk_system_identity" {
  command = plan

  variables {
    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.KeyVault/vaults/kv-common"
    }
  }

  assert {
    condition     = azurerm_storage_account.this.identity[0].type == "SystemAssigned"
    error_message = "identity type must be SystemAssigned when no user_assigned_identity_id is provided"
  }
}

# ── 16. CMK with user-assigned identity ─────────────────────────────────────
run "storage_account_cmk_user_assigned_identity" {
  command = plan

  variables {
    customer_managed_key = {
      enabled = true
      type    = "kv"
      # Different subscription so same_subscription=false → no role assignment created for principal_id validation
      key_vault_id              = "/subscriptions/11111111-1111-1111-1111-111111111111/resourceGroups/rg-common/providers/Microsoft.KeyVault/vaults/kv-common"
      user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/mi-test"
    }
  }

  assert {
    condition     = azurerm_storage_account.this.identity[0].type == "SystemAssigned, UserAssigned"
    error_message = "identity type must be 'SystemAssigned, UserAssigned' when user_assigned_identity_id is set"
  }
}

# ── 17. Static website ──────────────────────────────────────────────────────
run "storage_account_static_website" {
  command = plan

  variables {
    static_website = {
      enabled            = true
      index_document     = "index.html"
      error_404_document = "404.html"
    }
  }

  assert {
    condition     = azurerm_storage_account.this.static_website[0].index_document == "index.html"
    error_message = "static_website index_document must be set correctly"
  }

  assert {
    condition     = azurerm_storage_account.this.static_website[0].error_404_document == "404.html"
    error_message = "static_website error_404_document must be set correctly"
  }
}

# ── 18. Override infrastructure encryption (deprecated) ─────────────────────
run "storage_account_override_infrastructure_encryption" {
  command = plan

  variables {
    use_case           = "audit"
    secondary_location = "westeurope"

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.KeyVault/vaults/kv-common"
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.OperationalInsights/workspaces/law-common"
    }

    override_infrastructure_encryption = true
  }

  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == false
    error_message = "infrastructure_encryption_enabled must be false when override_infrastructure_encryption=true"
  }
}
