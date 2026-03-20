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

# The private_app subnet is ephemeral (test-only). During test runs we temporarily
# switch the peering to whole-VNet mode to simplify routing consistency from runner
# to private endpoints and container instances, then restore subnet filtering on destroy.
resource "terraform_data" "peering_private_app_subnet" {
  triggers_replace = {
    peering_name            = "${data.azurerm_virtual_network.common.name}-to-${data.azurerm_virtual_network.e2e.name}"
    peering_vnet_name       = data.azurerm_virtual_network.common.name
    peering_rg              = data.azurerm_virtual_network.common.resource_group_name
    peering_remote_vnet_id  = data.azurerm_virtual_network.e2e.id
    private_app_subnet_name = azurerm_subnet.private_app.name
    pep_subnet_name         = data.azurerm_subnet.pep.name
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      set -euo pipefail

      if ! az network vnet peering show \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}" \
        >/dev/null 2>&1; then
        az network vnet peering create \
          --name "${self.triggers_replace.peering_name}" \
          --vnet-name "${self.triggers_replace.peering_vnet_name}" \
          --resource-group "${self.triggers_replace.peering_rg}" \
          --remote-vnet "${self.triggers_replace.peering_remote_vnet_id}" \
          --allow-vnet-access true
      fi

      az network vnet peering update \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}" \
        --set "peer_complete_vnets=true" "remote_subnet_names=[]"
      az network vnet peering sync \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}"
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      set -euo pipefail

      if az network vnet peering show \
        --name "${self.triggers_replace.peering_name}" \
        --vnet-name "${self.triggers_replace.peering_vnet_name}" \
        --resource-group "${self.triggers_replace.peering_rg}" \
        >/dev/null 2>&1; then
        az network vnet peering update \
          --name "${self.triggers_replace.peering_name}" \
          --vnet-name "${self.triggers_replace.peering_vnet_name}" \
          --resource-group "${self.triggers_replace.peering_rg}" \
          --set "peer_complete_vnets=false" "remote_subnet_names=[\"${self.triggers_replace.pep_subnet_name}\"]"
        az network vnet peering sync \
          --name "${self.triggers_replace.peering_name}" \
          --vnet-name "${self.triggers_replace.peering_vnet_name}" \
          --resource-group "${self.triggers_replace.peering_rg}"
      else
        echo "Peering ${self.triggers_replace.peering_name} not found, skipping rollback"
      fi
    EOT
  }
}

# Allow time for the VNet peering route change to propagate before the test
# validation stage attempts to reach the private container instance.
resource "time_sleep" "wait_for_peering_propagation" {
  create_duration = "60s"

  depends_on = [terraform_data.peering_private_app_subnet]
}
