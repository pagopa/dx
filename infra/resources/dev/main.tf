terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.111.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfdevdx"
    container_name       = "terraform-state"
    key                  = "dx.resources.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

module "test" {
  source = "../../modules/azure_app_service_plan_autoscaler"
  scale_metrics = {
    requests = {
      upper_threshold = 9
      lower_threshold = 2
      increase_by     = 3
      decrease_by     = 4
    },
    cpu = {
      upper_threshold = 89
      lower_threshold = 27
      # increase_by     = 5
      # decrease_by     = 6
    },
    # memory = {
    #   upper_threshold = 78
    #   lower_threshold = 29
    #   increase_by     = 7
    #   decrease_by     = 8
    # },
    cooldown = {
      requests_rule = {
        increase = "PT100M"
        # decrease = "PT100M"
      }
      cpu_rule = {
        increase = "PT100M"
        decrease = "PT100M"
      }
      memory_rule = {
        increase = "PT100M"
        decrease = "PT100M"
      }
    },
    statistic = {
      requests_rule = {
        increase = "Max"
        decrease = "Max"
      }
      # cpu_rule = {
      #   increase = "Max"
      #   decrease = "Max"
      # }
      memory_rule = {
        increase = "Max"
        decrease = "Max"
      }
    },
    # time_aggregation = {
    #   requests_rule = {
    #     increase = "Maximum"
    #     decrease = "Maximum"
    #   }
    #   cpu_rule = {
    #     increase = "Maximum"
    #     decrease = "Maximum"
    #   }
    #   memory_rule = {
    #     increase = "Maximum"
    #     decrease = "Maximum"
    #   }
    # }
    time_aggregation = {}
    time_window = {
      requests_rule = {
        increase = "PT10M"
        decrease = "PT10M"
      }
      cpu_rule = {
        increase = "PT10M"
        decrease = "PT10M"
      }
      memory_rule = {
        increase = "PT10M"
        decrease = "PT10M"
      }
    }
  }

  # cooldown_scale_action = {
  #   requests_rule_increase ="PT100M"
  #   requests_rule_decrease = "PT100M"
  #   cpu_rule_increase      = "PT100M"
  #   cpu_rule_decrease      = "PT100M"
  #   memory_rule_increase   = "PT100M"
  #   memory_rule_decrease   = "PT100M"
  # }

  # time_aggregation_metric_trigger = {
  #   requests_rule_increase = "Maximum"
  #   requests_rule_decrease = "Maximum"
  #   cpu_rule_increase      = "Maximum"
  #   cpu_rule_decrease      = "Maximum"
  #   memory_rule_increase   = "Maximum"
  #   memory_rule_decrease   = "Maximum"
  # }

  # statistic_metric_trigger = {
  #   requests_rule_increase = "Max"
  #   requests_rule_decrease = "Max"
  #   cpu_rule_increase      = "Max"
  #   cpu_rule_decrease      = "Max"
  #   memory_rule_increase   = "Max"
  #   memory_rule_decrease   = "Max"
  # }

  target_service = {
    app_service_name  = "io-d-link"
    function_app_name = null
  }
  resource_group_name = "io-d-link_group"
  tags                = {}
}