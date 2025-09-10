terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0"
    }
  }
}

# DNS Forwarder with cross-cloud support
module "dns_forwarder" {
  source              = "github.com/pagopa/terraform-azurerm-v4//dns_forwarder?ref=v1.9.0"
  name                = "${var.project}-dns-forwarder-ci-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.dnsforwarder_subnet_id

  # Custom CoreDNS configuration for cross-cloud DNS resolution
  custom_config_map = var.cross_cloud_dns_enabled ? {
    Corefile = templatefile("${path.module}/coredns_corefile.tpl", {
      aws_coredns_ip = var.cross_cloud_dns_config.aws_coredns_ip
      azure_dns_ip   = "168.63.129.16"
    })
  } : null

  tags = var.tags
}
