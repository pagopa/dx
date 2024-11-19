provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
  
  variables {}
}

run "common_is_correct_plan" {
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
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/common_environment/tests"
      Test        = "true"
      TestName    = "Create DEV environment for test"
    }

    virtual_network_cidr = "10.50.0.0/16"
    pep_subnet_cidr      = "10.50.2.0/23"

    vpn = {
      cidr_subnet              = "10.50.133.0/24"
      dnsforwarder_cidr_subnet = "10.50.252.8/29"
    }
  }

  # Checks some assertions
  assert {
    condition     = local.vpn_enable == true
    error_message = "VPN have to be enabled becouse cidr_subnet and dnsforwarder_cidr_subnet are set"
  }

  assert {
    condition     = [module.network.vnet.name, module.network.pep_snet.name, module.network.nat_gateways[0].name] == ["io-p-itn-common-vnet-01", "io-p-itn-pep-snet-01", "io-p-itn-ng-01"]
    error_message = "The VNET names configuration must be correct"
  }

  assert {
    condition     = [module.network.vnet.address_space[0], module.network.pep_snet.address_prefixes[0]] == ["10.50.0.0/16", "10.50.2.0/23"]
    error_message = "The VNET address space and PEP subnet configuration must be correct"
  }

  assert {
    condition     = module.dns.private_dns_zones.mysql.name == "privatelink.mysql.database.azure.com"
    error_message = "The Private DNS Zones configuration must be correct"
  }
}