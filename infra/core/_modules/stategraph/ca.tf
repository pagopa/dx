resource "dx_available_subnet_cidr" "cae_subnet_cidr" {
  virtual_network_id = var.vnet.id
  prefix_length      = 27
}

resource "azurerm_subnet" "stategraph_cae" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "container_app_subnet",
  }))
  resource_group_name  = var.vnet.resource_group_name
  virtual_network_name = var.vnet.name
  address_prefixes     = [dx_available_subnet_cidr.cae_subnet_cidr.cidr_block]

  delegation {
    name = "delegation"
    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_container_app_environment" "stategraph" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type   = "container_app_environment",
    instance_number = "02"
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  identity { type = "SystemAssigned" }

  infrastructure_subnet_id       = azurerm_subnet.stategraph_cae.id
  internal_load_balancer_enabled = false
  public_network_access          = "Disabled"

  log_analytics_workspace_id = var.log_analytics_workspace_id
  zone_redundancy_enabled    = true

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  lifecycle {
    ignore_changes = [
      infrastructure_resource_group_name, # Otherwise Terraform forces the recreation at every plan due to provider issue
    ]
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "cae_stategraph" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "container_app_private_endpoint",
  }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location
  subnet_id           = var.pep_subnet_id

  private_service_connection {
    name = provider::dx::resource_name(merge(var.environment, {
      resource_type = "container_app_private_endpoint",
    }))
    private_connection_resource_id = azurerm_container_app_environment.stategraph.id
    is_manual_connection           = false
    subresource_names              = ["managedEnvironments"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [var.cae_dns_zone_id]
  }

  tags = var.tags
}

resource "azurerm_container_app" "stategraph" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type   = "container_app",
    instance_number = "02"
  }))
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  container_app_environment_id = azurerm_container_app_environment.stategraph.id

  identity { type = "SystemAssigned" }

  ingress {
    target_port      = 8080
    external_enabled = true
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    max_replicas = 1
    min_replicas = 0
    http_scale_rule {
      concurrent_requests = "10"
      name                = "http-scaler"
    }

    container {
      image  = "ghcr.io/stategraph/stategraph-server:0.1.28"
      cpu    = 1
      memory = "2Gi"
      name   = "stategraph"

      dynamic "env" {
        for_each = local.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.environment_secrets
        content {
          name        = env.value
          secret_name = lower(replace(env.value, "_", "-")) # Azure Key Vault secret names cannot contain underscores
        }
      }

      liveness_probe {
        initial_delay           = 5
        interval_seconds        = 10
        failure_count_threshold = 3
        path                    = "/health/live"
        port                    = 8080
        transport               = "HTTP"
      }
      readiness_probe {
        initial_delay           = 10
        interval_seconds        = 10
        failure_count_threshold = 10
        path                    = "/health/ready"
        port                    = 8080
        transport               = "HTTP"
      }
    }
  }

  dynamic "secret" {
    for_each = local.environment_secrets
    content {
      name                = lower(replace(secret.value, "_", "-"))
      key_vault_secret_id = "https://${var.key_vault.name}.vault.azure.net/secrets/${lower(replace(secret.value, "_", "-"))}"
      identity            = "System"
    }
  }

  lifecycle {
    ignore_changes = [
      workload_profile_name # Otherwise Terraform forces the recreation at every plan due to provider issue
    ]
  }

  depends_on = [
    azurerm_key_vault_secret.stategraph_postgres_password
  ]

  tags = var.tags
}

resource "azurerm_role_assignment" "keyvault_ca" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app.stategraph.identity[0].principal_id
  description          = "Allow the Container App to read to secrets and certificates"
}

resource "azurerm_role_assignment" "keyvault_cae" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app_environment.stategraph.identity[0].principal_id
  description          = "Allow the Container App Environment to read to certificates"
}

locals {
  stategraph_domain_name      = trim(azurerm_dns_cname_record.stategraph.fqdn, ".")
  stategraph_certificate_name = replace(local.stategraph_domain_name, ".", "-")
}

resource "azurerm_container_app_environment_certificate" "stategraph" {
  name                         = local.stategraph_certificate_name
  container_app_environment_id = azurerm_container_app_environment.stategraph.id

  certificate_key_vault {
    identity            = "System"
    key_vault_secret_id = "https://${var.key_vault.name}.vault.azure.net/secrets/${local.stategraph_certificate_name}"
  }

  depends_on = [azurerm_role_assignment.keyvault_cae]

  tags = var.tags
}

resource "azurerm_container_app_custom_domain" "stategraph" {
  name                                     = local.stategraph_domain_name
  container_app_id                         = azurerm_container_app.stategraph.id
  container_app_environment_certificate_id = azurerm_container_app_environment_certificate.stategraph.id
  certificate_binding_type                 = "SniEnabled" # enable https only
}
