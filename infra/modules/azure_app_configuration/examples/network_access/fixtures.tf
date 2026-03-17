resource "azurerm_resource_group" "e2e_appcs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e"
    name          = "appcs",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_container_group" "public_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { name = "appcs-public", resource_type = "container_instance" })
  )
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_appcs.name

  identity { type = "SystemAssigned" }

  os_type = "Linux"

  container {
    name   = "network-access"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port = 8080
    }
  }

  diagnostics {
    log_analytics {
      workspace_id  = data.azurerm_log_analytics_workspace.e2e.workspace_id
      workspace_key = data.azurerm_log_analytics_workspace.e2e.primary_shared_key
    }
  }

  tags = local.tags
}

resource "dx_available_subnet_cidr" "private_app" {
  virtual_network_id = data.azurerm_virtual_network.e2e.id
  prefix_length      = 26
}

resource "azurerm_subnet" "private_app" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "appcs-private",
    resource_type = "container_instance_subnet"
  }))
  resource_group_name  = local.e2e_virtual_network.resource_group_name
  virtual_network_name = local.e2e_virtual_network.name
  address_prefixes     = [dx_available_subnet_cidr.private_app.cidr_block]

  delegation {
    name = "Microsoft.ContainerInstance/containerGroups"

    service_delegation {
      name = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

resource "azurerm_container_group" "private_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { name = "appcs-private", resource_type = "container_instance" })
  )
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_appcs.name

  identity { type = "SystemAssigned" }

  os_type = "Linux"

  container {
    name   = "network-access"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port = 8080
    }
  }

  ip_address_type = "Private"

  subnet_ids = [
    azurerm_subnet.private_app.id
  ]

  diagnostics {
    log_analytics {
      workspace_id  = data.azurerm_log_analytics_workspace.e2e.workspace_id
      workspace_key = data.azurerm_log_analytics_workspace.e2e.primary_shared_key
    }
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "role_appcs_private" {
  scope                = module.private_appcs.id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_container_group.private_app.identity[0].principal_id
  description          = "Allow private Container Instance to read from App Configuration"
}

resource "azurerm_role_assignment" "role_appcs_public" {
  scope                = module.private_appcs.id
  role_definition_name = "App Configuration Data Reader"
  principal_id         = azurerm_container_group.public_app.identity[0].principal_id
  description          = "Allow public Container Instance to read from App Configuration"
}

resource "azurerm_role_assignment" "integration_github_roles" {
  scope                = module.private_appcs.id
  role_definition_name = "App Configuration Data Owner"
  principal_id         = data.azurerm_user_assigned_identity.integration_github.principal_id
  description          = "Allow GitHub to write settings on App Configuration"
}

# The private_app subnet is ephemeral (test-only) but the VNet peering between the
# common VNet and the e2e VNet is permanent and filters by remote_subnet_names.
# This resource temporarily adds private_app to the allowed remote subnets via CLI
# so the self-hosted runner can reach the private container instance during tests,
# then restores the original filter on destroy.
resource "terraform_data" "peering_private_app_subnet" {
  triggers_replace = {
    peering_name            = "${data.azurerm_virtual_network.common.name}-to-${data.azurerm_virtual_network.e2e.name}"
    peering_vnet_name       = data.azurerm_virtual_network.common.name
    peering_rg              = data.azurerm_virtual_network.common.resource_group_name
    private_app_subnet_name = azurerm_subnet.private_app.name
    pep_subnet_name         = data.azurerm_subnet.pep.name
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      az network vnet peering update \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}" \
        --set "remote_subnet_names=[\"${self.triggers_replace.pep_subnet_name}\",\"${self.triggers_replace.private_app_subnet_name}\"]"
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      az network vnet peering update \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}" \
        --set "remote_subnet_names=[\"${self.triggers_replace.pep_subnet_name}\"]"
    EOT
  }
}
