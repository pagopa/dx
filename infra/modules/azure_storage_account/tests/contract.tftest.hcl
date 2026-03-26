# Contract tests for azure_storage_account module.
# Validates all var.* validation blocks (1:1 mapping with variables.tf).
# Uses the same mock pattern as unit tests.

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
    TestName       = "Storage Account contract tests"
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

# ── 1. Invalid use_case value ───────────────────────────────────────────────
run "invalid_use_case" {
  command = plan

  variables {
    use_case = "invalid"
  }

  expect_failures = [var.use_case]
}

# ── 2. Missing subnet_pep_id when force_public=false ────────────────────────
run "missing_subnet_pep_for_private_storage" {
  command = plan

  variables {
    force_public_network_access_enabled = false
    subnet_pep_id                       = null
  }

  expect_failures = [var.subnet_pep_id]
}

# ── 3. Audit requires CMK ───────────────────────────────────────────────────
run "audit_requires_cmk" {
  command = plan

  variables {
    use_case             = "audit"
    secondary_location   = "westeurope"
    customer_managed_key = { enabled = false }
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-common/providers/Microsoft.OperationalInsights/workspaces/law-common"
    }
  }

  expect_failures = [var.customer_managed_key]
}

# ── 4. Audit requires diagnostic_settings with log_analytics_workspace_id ───
run "audit_requires_diagnostic_settings_with_law" {
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
      log_analytics_workspace_id = null
    }
  }

  expect_failures = [var.diagnostic_settings]
}

# ── 5. Audit requires diagnostic_settings enabled ───────────────────────────
run "audit_no_diagnostic_settings_at_all" {
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
      enabled                    = false
      log_analytics_workspace_id = null
    }
  }

  expect_failures = [var.diagnostic_settings]
}

# ── 6. Audit with neither blob nor file subservice ───────────────────────────
run "audit_subservices_require_blob_or_file" {
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
    subservices_enabled = {
      blob  = false
      file  = false
      queue = true
      table = true
    }
  }

  expect_failures = [var.subservices_enabled]
}

# ── 7. Audit with only table subservice (not blob or file) ──────────────────
run "audit_only_table_not_enough" {
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
    subservices_enabled = {
      blob  = false
      file  = false
      queue = false
      table = true
    }
  }

  expect_failures = [var.subservices_enabled]
}

# ── 8. Immutability policy incompatible with restore_policy ─────────────────
run "immutability_incompatible_with_restore_policy" {
  command = plan

  variables {
    blob_features = {
      immutability_policy = {
        enabled = true
      }
      restore_policy_days = 7
    }
  }

  expect_failures = [var.blob_features]
}

# ── 9. Invalid immutability state ───────────────────────────────────────────
run "invalid_immutability_state" {
  command = plan

  variables {
    blob_features = {
      immutability_policy = {
        enabled = true
        state   = "BadState"
      }
    }
  }

  expect_failures = [var.blob_features]
}

# ── 10. delete_retention_days out of range (>365) ───────────────────────────
run "delete_retention_days_out_of_range" {
  command = plan

  variables {
    blob_features = {
      delete_retention_days = 366
    }
  }

  expect_failures = [var.blob_features]
}

# ── 11. restore_policy_days out of range (>365) ─────────────────────────────
run "restore_policy_days_out_of_range" {
  command = plan

  variables {
    blob_features = {
      restore_policy_days = 366
    }
  }

  expect_failures = [var.blob_features]
}

# ── 12. Audit use case with non-zero delete_retention_days ──────────────────
run "audit_with_nonzero_delete_retention" {
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
    blob_features = {
      delete_retention_days = 14
    }
  }

  expect_failures = [var.blob_features]
}

# ── 13. Archive use case with non-zero restore_policy_days ──────────────────
run "archive_with_nonzero_restore_policy" {
  command = plan

  variables {
    use_case = "archive"
    blob_features = {
      restore_policy_days = 30
    }
  }

  expect_failures = [var.blob_features]
}

# ── 14. Invalid container access_type ───────────────────────────────────────
run "invalid_container_access_type" {
  command = plan

  variables {
    containers = [
      {
        name        = "test-container"
        access_type = "public"
      }
    ]
  }

  expect_failures = [var.containers]
}

# ── 15. Container immutability_policy period_in_days too low (0) ────────────
run "container_immutability_period_too_low" {
  command = plan

  variables {
    containers = [
      {
        name        = "test-container"
        access_type = "private"
        immutability_policy = {
          period_in_days = 0
        }
      }
    ]
  }

  expect_failures = [var.containers]
}

# ── 16. audit_retention_days out of allowed range ───────────────────────────
run "audit_retention_days_out_of_range" {
  command = plan

  variables {
    audit_retention_days = 89
  }

  expect_failures = [var.audit_retention_days]
}
