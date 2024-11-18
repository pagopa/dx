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
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

run "storage_account_is_correct_plan" {
  command = plan

  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
      CreatedBy   = "Terraform"
      Environment = "Prod"
      Owner       = "IO"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_storage_account/tests"
      Test        = "true"
      TestName    = "Create Storage Account for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"
  
    customer_managed_key = {
      enabled                   = false
    }

    subnet_pep_id =  run.setup_tests.pep_id

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

    force_public_network_access_enabled = false

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
    condition     = length(azurerm_security_center_storage_defender.this) > 0
    error_message = "The Storage Account security center storage defender must be created"
  }

  assert {
    condition     = azurerm_storage_account_network_rules.network_rules.default_action == "Deny"
    error_message = "The Storage Account must have firewall rules enabled"
  }

  assert {
    condition     = azurerm_storage_account.this.access_tier == "Hot"
    error_message = "The Storage Account must have the access tier set to Hot"
  }
}