# Unit tests for networking configuration
# Tests subnet creation, custom subnets, and service endpoints

provider "azurerm" {
  features {}
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
  }
}

# Test subnet creation (default behavior)
run "networking_subnet_creation" {
  command = plan

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
      Test = "unit-test-subnet-creation"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.70.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "Subnet should be created when subnet_cidr is provided"
  }

  assert {
    condition     = azurerm_subnet.this[0].address_prefixes[0] == "10.20.70.0/24"
    error_message = "Subnet should have correct CIDR"
  }

  assert {
    condition     = azurerm_subnet.this[0].virtual_network_name == run.setup_tests.vnet.name
    error_message = "Subnet should be in correct virtual network"
  }

  assert {
    condition     = azurerm_subnet.this[0].resource_group_name == run.setup_tests.vnet.resource_group_name
    error_message = "Subnet should be in correct resource group"
  }

  assert {
    condition     = azurerm_linux_web_app.this.virtual_network_subnet_id == azurerm_subnet.this[0].id
    error_message = "App Service should use created subnet"
  }
}

# Test custom subnet usage
run "networking_custom_subnet" {
  command = plan

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
      Test = "unit-test-custom-subnet"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_id                            = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 0
    error_message = "No subnet should be created when subnet_id is provided"
  }

  assert {
    condition     = azurerm_linux_web_app.this.virtual_network_subnet_id == run.setup_tests.pep_id
    error_message = "App Service should use provided subnet_id"
  }
}

# Test service endpoints configuration
run "networking_service_endpoints" {
  command = plan

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
      Test = "unit-test-service-endpoints"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.71.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    subnet_service_endpoints = {
      cosmos  = true
      storage = true
      web     = false
    }

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.CosmosDB")
    error_message = "Cosmos DB service endpoint should be enabled"
  }

  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.Storage")
    error_message = "Storage service endpoint should be enabled"
  }

  assert {
    condition     = !contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.Web")
    error_message = "Web service endpoint should be disabled"
  }
}

# Test private endpoints configuration
run "networking_private_endpoints" {
  command = plan

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
      Test = "unit-test-private-endpoints"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.72.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_private_endpoint.app_service_sites.subnet_id == run.setup_tests.pep_id
    error_message = "App Service private endpoint should use correct subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.app_service_sites.private_service_connection[0].private_connection_resource_id == azurerm_linux_web_app.this.id
    error_message = "Private endpoint should connect to the App Service"
  }

  assert {
    condition     = azurerm_private_endpoint.app_service_sites.private_service_connection[0].subresource_names[0] == "sites"
    error_message = "Private endpoint should use 'sites' subresource"
  }

  assert {
    condition     = azurerm_private_endpoint.app_service_sites.private_service_connection[0].is_manual_connection == false
    error_message = "Private endpoint connection should be automatic"
  }
}

# Test staging slot private endpoints (medium tier and above)
run "networking_staging_private_endpoints" {
  command = plan

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
      Test = "unit-test-staging-private-endpoints"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.73.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_private_endpoint.staging_app_service_sites) == 1
    error_message = "Staging slot private endpoint should be created for medium tier"
  }

  assert {
    condition     = azurerm_private_endpoint.staging_app_service_sites[0].subnet_id == run.setup_tests.pep_id
    error_message = "Staging private endpoint should use correct subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.staging_app_service_sites[0].private_service_connection[0].private_connection_resource_id == azurerm_linux_web_app.this.id
    error_message = "Staging private endpoint should connect to the App Service"
  }

  assert {
    condition     = azurerm_private_endpoint.staging_app_service_sites[0].private_service_connection[0].subresource_names[0] == "sites-staging"
    error_message = "Staging private endpoint should use 'sites-staging' subresource"
  }
}

# Test no staging slot private endpoints for small tier
run "networking_no_staging_private_endpoints_small" {
  command = plan

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
      Test = "unit-test-no-staging-private-endpoints"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "s"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.74.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_private_endpoint.staging_app_service_sites) == 0
    error_message = "No staging slot private endpoint should be created for small tier"
  }
}

# Test custom private DNS zone resource group
run "networking_custom_dns_zone_rg" {
  command = plan

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
      Test = "unit-test-custom-dns-zone-rg"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.75.0/24"
    private_dns_zone_resource_group_name = "custom-dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # We can't directly test the data source lookup, but we can verify the private endpoint was created
  assert {
    condition     = azurerm_private_endpoint.app_service_sites.subnet_id == run.setup_tests.pep_id
    error_message = "Private endpoint should be created with custom DNS zone resource group"
  }
}