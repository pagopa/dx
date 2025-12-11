provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

override_resource {
  target = azurerm_storage_account.this
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      ManagementTeam = "Developer Experience"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_storage_account/tests"
      Test           = "true"
      TestName       = "Create Storage Account for test"
    }
  }
}

run "storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    subnet_pep_id = run.setup_tests.pep_id

    blob_features = {
      immutability_policy = {
        enabled                       = true
        allow_protected_append_writes = true
        period_since_creation_in_days = 730
      }
      delete_retention_days = 14
      versioning            = true
      last_access_time      = true
      change_feed = {
        enabled           = true
        retention_in_days = 30
      }
    }

    access_tier = "Hot"

    subservices_enabled = {
      blob  = true
      file  = true
      queue = true
      table = true
    }

    network_rules = {
      default_action             = "Deny"
      bypass                     = ["AzureServices"]
      ip_rules                   = ["203.0.113.0/24"]
      virtual_network_subnet_ids = [run.setup_tests.subnet_id]
    }

    static_website = {
      enabled            = true
      index_document     = "index.html"
      error_404_document = "404.html"
    }

    custom_domain = {
      name          = "example.com"
      use_subdomain = true
    }

    containers = [
      {
        name        = "container1"
        access_type = "private"
      },
      {
        name        = "container2"
        access_type = "private"
      }
    ]

    tables = [
      "table1",
      "table2"
    ]

    queues = [
      "queue1",
      "queue2"
    ]

  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.account_tier == "Standard"
    error_message = "The Storage Account must use the correct Account Tier (Standard)"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "The Storage Account must use the correct Account Replication Type (ZRS)"
  }

  assert {
    condition     = azurerm_storage_account_network_rules.network_rules[0].default_action == "Deny"
    error_message = "The Storage Account must have firewall rules enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.access_tier == "Hot"
    error_message = "The Storage Account must have the access tier set to Hot"
  }

  assert {
    condition     = azurerm_storage_account_customer_managed_key.kv["kv"].user_assigned_identity_id == null
    error_message = "The storage account's managed identity should be used instead of user assigned identity"
  }

  assert {
    condition     = local.peps.create_subservices.blob == true
    error_message = "The Storage Account must have blob private endpoint disabled"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == false
    error_message = "The Storage Account must have public network access disabled"
  }

  assert {
    condition     = azurerm_storage_account.this.allow_nested_items_to_be_public == false
    error_message = "The Storage Account must not allow Blob public access"
  }

  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == true
    error_message = "The Storage Account must have shared access key enabled"
  }

  assert {
    condition     = azurerm_security_center_storage_defender.this == []
    error_message = "The Storage Account must have Storage Defender disabled"
  }

  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Unlocked"
    error_message = "The Storage Account must have immutability policy"
  }

  assert {
    condition     = length(azurerm_storage_container.this) == 2 && length(azurerm_storage_table.this) == 2 && length(azurerm_storage_queue.this) == 2
    error_message = "The Storage Account must have 2 containers, 2 tables and 2 queues created"
  }
}

run "public_storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    blob_features = {
      delete_retention_days = 14
      versioning            = true
      last_access_time      = true
      change_feed = {
        enabled           = true
        retention_in_days = 30
      }
    }

    force_public_network_access_enabled = true

    network_rules = {
      default_action             = "Deny"
      bypass                     = ["AzureServices"]
      ip_rules                   = ["203.0.113.0/24"]
      virtual_network_subnet_ids = [run.setup_tests.subnet_id]
    }

    static_website = {
      enabled            = true
      index_document     = "index.html"
      error_404_document = "404.html"
    }

    custom_domain = {
      name          = "example.com"
      use_subdomain = true
    }

  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "The Storage Account must have public network access enabled"
  }

  assert {
    condition     = local.peps.create_subservices.blob == false
    error_message = "The Storage Account must have blob private endpoint disabled"
  }

  assert {
    condition     = azurerm_security_center_storage_defender.this[0] != null
    error_message = "The Storage Account must have Storage Defender enabled"
  }

  assert {
    condition     = length(azurerm_storage_account.this.immutability_policy) == 0
    error_message = "The Storage Account must not have immutability policy"
  }
}

run "delegated_access_storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "delegated_access"
  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == false
    error_message = "The Storage Account must not have shared access key enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "The Storage Account must have public network access enabled"
  }

  assert {
    condition     = azurerm_security_center_storage_defender.this[0] != null
    error_message = "The Storage Account must have Storage Defender enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "The Storage Account must use the correct Account Replication Type (ZRS)"
  }

  assert {
    condition     = length(azurerm_storage_account.this.immutability_policy) == 0
    error_message = "The Storage Account must not have immutability policy"
  }
}

run "audit_storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"

    subnet_pep_id = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    audit_retention_days = 365
  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == true
    error_message = "The Storage Account must have shared access key enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == false
    error_message = "The Storage Account must have public network access disabled"
  }

  assert {
    condition     = azurerm_security_center_storage_defender.this == []
    error_message = "The Storage Account must have Storage Defender disabled"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS"
    error_message = "The Storage Account must use the correct Account Replication Type (ZRS)"
  }

  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Unlocked"
    error_message = "Audit storage must have immutability policy in Unlocked state (Azure limitation: initial state cannot be Locked)"
  }

  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].period_since_creation_in_days == 730
    error_message = "Audit storage must have correct immutability retention period"
  }

  assert {
    condition     = azurerm_storage_management_policy.lifecycle_audit[0].rule[0].name == "audit-log-lifecycle-policy"
    error_message = "The Storage Account must have a lifecycle management policy for audit"
  }

  assert {
    condition     = azurerm_storage_account.secondary_replica[0] != null
    error_message = "The Storage Account must have a secondary replica"
  }

  assert {
    condition     = azurerm_storage_account.this.min_tls_version == "TLS1_2"
    error_message = "Audit storage must enforce TLS 1.2 minimum for encryption in transit"
  }

  assert {
    condition     = azurerm_storage_account.this.https_traffic_only_enabled == true
    error_message = "Audit storage must enforce HTTPS-only traffic"
  }

  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == true
    error_message = "Audit storage must enable infrastructure encryption (double encryption)"
  }

  assert {
    condition     = local.peps.create_subservices.blob == true || local.peps.create_subservices.file == true
    error_message = "Audit storage with infrastructure encryption requires at least blob or file subservice enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.cross_tenant_replication_enabled == false
    error_message = "Audit storage must disable cross-tenant replication to prevent data exfiltration"
  }

  assert {
    condition     = azurerm_storage_account.this.default_to_oauth_authentication == true
    error_message = "Audit storage must default to OAuth authentication"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.storage_account[0] != null
    error_message = "Audit storage must have diagnostic settings enabled for control plane logging"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.blob_service[0] != null
    error_message = "Audit storage must have blob service diagnostic settings enabled for data plane logging"
  }

  assert {
    condition     = azurerm_storage_management_policy.lifecycle_audit[0].rule[0].actions[0].base_blob[0].delete_after_days_since_modification_greater_than == 365
    error_message = "Audit storage must use configured retention period (365 days for PagoPA)"
  }
}

run "archive_storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "archive"
    secondary_location  = "westeurope"

    subnet_pep_id = run.setup_tests.pep_id
  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.shared_access_key_enabled == true
    error_message = "The Storage Account must have shared access key enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == false
    error_message = "The Storage Account must have public network access disabled"
  }

  assert {
    condition     = azurerm_security_center_storage_defender.this == []
    error_message = "The Storage Account must have Storage Defender disabled"
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "LRS"
    error_message = "The Storage Account must use the correct Account Replication Type (LRS)"
  }

  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Unlocked"
    error_message = "The Storage Account must have immutability policy"
  }

  assert {
    condition     = azurerm_storage_management_policy.lifecycle_archive[0].rule[0].name == "archive-storage-lifecycle-policy"
    error_message = "The Storage Account must have a lifecycle management policy for archive"
  }

  assert {
    condition     = azurerm_storage_account.secondary_replica[0] != null
    error_message = "The Storage Account must have a secondary replica"
  }
}

run "audit_storage_account_fail_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }
  }

  # Checks some assertions
  expect_failures = [
    var.customer_managed_key,
  ]
}

run "audit_without_blob_or_file_fail_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    # Infrastructure encryption requires blob or file, but neither is enabled
    subservices_enabled = {
      blob  = false
      file  = false
      queue = true
      table = true
    }
  }

  # Should fail because audit tier requires blob or file for infrastructure encryption
  expect_failures = [
    var.subservices_enabled,
  ]
}

run "audit_with_only_table_fail_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    # Only table enabled - should fail
    subservices_enabled = {
      blob  = false
      file  = false
      queue = false
      table = true
    }
  }

  # Should fail because audit tier with infrastructure encryption requires blob or file
  expect_failures = [
    var.subservices_enabled,
  ]
}

run "delegated_access_private_storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "delegated_access"

    force_public_network_access_enabled = false
  }

  # Checks some assertions
  assert {
    condition     = azurerm_storage_account.this.public_network_access_enabled == true
    error_message = "The Storage Account must have public network access enabled"
  }
}

run "container_level_immutability_policy_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment
    tags        = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    containers = [
      {
        name        = "audit-logs"
        access_type = "private"
        immutability_policy = {
          period_in_days = 365
          locked         = false
        }
      },
      {
        name        = "archived-logs"
        access_type = "private"
        immutability_policy = {
          period_in_days = 2555 # 7 years
          locked         = true
        }
      },
      {
        name                = "regular-data"
        access_type         = "private"
        immutability_policy = null # No immutability
      }
    ]
  }

  # Container-level immutability assertions
  assert {
    condition     = length(azurerm_storage_container_immutability_policy.this) == 2
    error_message = "Should create immutability policies for 2 containers (audit-logs and archived-logs)"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.this["audit-logs"].locked == false
    error_message = "audit-logs container policy should be unlocked to allow legal hold modifications"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.this["archived-logs"].locked == true
    error_message = "archived-logs container policy should be locked for compliance"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.this["audit-logs"].immutability_period_in_days == 365
    error_message = "audit-logs container should have 365-day retention period"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.this["archived-logs"].immutability_period_in_days == 2555
    error_message = "archived-logs container should have 7-year retention period"
  }

  assert {
    condition     = length(azurerm_storage_container.this) == 3
    error_message = "Should create all 3 containers regardless of immutability policy"
  }
}

run "audit_with_container_immutability_plan" {
  command = plan

  variables {
    environment         = run.setup_tests.environment
    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    containers = [
      {
        name        = "compliance-logs"
        access_type = "private"
        immutability_policy = {
          period_in_days = 730
          locked         = true
        }
      }
    ]
  }

  # Audit tier with container-level immutability
  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Unlocked"
    error_message = "Audit tier must have account-level immutability policy (Unlocked initially due to Azure limitation)"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.this["compliance-logs"].locked == true
    error_message = "Container immutability policy should be locked for compliance"
  }

  assert {
    condition     = azurerm_storage_container_immutability_policy.replica["compliance-logs"].locked == true
    error_message = "Secondary replica container immutability policy should also be locked"
  }

  assert {
    condition     = azurerm_storage_account.secondary_replica[0].immutability_policy[0].state == "Unlocked"
    error_message = "Secondary replica must have same immutability policy state as primary (Unlocked initially)"
  }
}

run "immutability_policy_state_override_plan" {
  command = plan

  variables {
    environment         = run.setup_tests.environment
    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"
    subnet_pep_id       = run.setup_tests.pep_id

    blob_features = {
      immutability_policy = {
        enabled                       = true
        allow_protected_append_writes = true
        period_since_creation_in_days = 730
        state                         = "Locked" # Override default "Unlocked" for non-audit tier
      }
    }
  }

  # Test explicit state override
  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Locked"
    error_message = "Immutability policy state should respect explicit variable override"
  }
}

# @deprecated: This test validates the override_infrastructure_encryption variable which will be removed in next major version
run "audit_with_infrastructure_encryption_override_plan" {
  command = plan

  variables {
    environment         = run.setup_tests.environment
    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    audit_retention_days = 365

    # Override infrastructure encryption for audit use case
    override_infrastructure_encryption = true

    subservices_enabled = {
      blob  = true
      file  = false
      queue = false
      table = false
    }
  }

  # Test that infrastructure encryption is disabled when override is set
  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == false
    error_message = "Infrastructure encryption should be disabled when override_infrastructure_encryption is true"
  }

  # Verify other audit settings remain unchanged
  assert {
    condition     = azurerm_storage_account.this.default_to_oauth_authentication == true
    error_message = "Audit storage must still default to OAuth authentication even with encryption override"
  }

  assert {
    condition     = azurerm_storage_account.this.min_tls_version == "TLS1_2"
    error_message = "Audit storage must still enforce TLS 1.2 even with encryption override"
  }

  assert {
    condition     = azurerm_storage_account.this.https_traffic_only_enabled == true
    error_message = "Audit storage must still enforce HTTPS-only traffic even with encryption override"
  }

  assert {
    condition     = azurerm_storage_account.this.immutability_policy[0].state == "Unlocked"
    error_message = "Audit storage must still have immutability policy even with encryption override"
  }

  assert {
    condition     = azurerm_storage_management_policy.lifecycle_audit[0] != null
    error_message = "Audit storage must still have lifecycle management policy even with encryption override"
  }
}

# @deprecated: This test validates the validation rule for override_infrastructure_encryption which will be removed in next major version
run "audit_without_override_requires_blob_or_file_subservice" {
  command = plan

  variables {
    environment         = run.setup_tests.environment
    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    audit_retention_days = 365

    # Infrastructure encryption enabled by default for audit (override not set)
    override_infrastructure_encryption = false

    # No blob or file subservices - should trigger validation error
    subservices_enabled = {
      blob  = false
      file  = false
      queue = true
      table = true
    }
  }

  expect_failures = [
    var.subservices_enabled,
  ]
}

# @deprecated: This test validates that override bypasses the validation rule - will be removed in next major version
run "audit_with_override_allows_no_blob_or_file_subservice" {
  command = plan

  variables {
    environment         = run.setup_tests.environment
    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "audit"
    secondary_location  = "westeurope"
    subnet_pep_id       = run.setup_tests.pep_id

    customer_managed_key = {
      enabled      = true
      type         = "kv"
      key_vault_id = run.setup_tests.kv_id
    }

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id
    }

    audit_retention_days = 365

    # Override to disable infrastructure encryption
    override_infrastructure_encryption = true

    # No blob or file subservices - should be allowed with override
    subservices_enabled = {
      blob  = false
      file  = false
      queue = true
      table = true
    }
  }

  # Verify infrastructure encryption is disabled
  assert {
    condition     = azurerm_storage_account.this.infrastructure_encryption_enabled == false
    error_message = "Infrastructure encryption should be disabled when override is set"
  }

  # Verify that only queue and table subservices are enabled
  assert {
    condition     = local.peps.create_subservices.blob == false && local.peps.create_subservices.file == false
    error_message = "Blob and file subservices should not be created when disabled"
  }

  assert {
    condition     = local.peps.create_subservices.queue == true && local.peps.create_subservices.table == true
    error_message = "Queue and table subservices should be created when enabled"
  }
}

