# Create a DNS CNAME record pointing the custom domain to the container app FQDN.
# Required for Azure to validate and serve traffic for the custom domain.
resource "azurerm_dns_cname_record" "this" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null ? 1 : 0

  name                = trimsuffix(var.custom_domain.host_name, ".${var.custom_domain.dns.zone_name}")
  zone_name           = var.custom_domain.dns.zone_name
  resource_group_name = var.custom_domain.dns.zone_resource_group_name
  ttl                 = 300
  record              = trimsuffix(azurerm_container_app.this.ingress[0].fqdn, ".")

  tags = local.tags
}

# Create a DNS TXT record used by Azure to verify ownership of the custom domain.
# The record name follows the asuid.<subdomain> convention required by Azure Container Apps.
# Only needed for Azure-managed certificate provisioning (not when a certificate_id is provided).
resource "azurerm_dns_txt_record" "validation" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null && var.custom_domain.certificate_id == null ? 1 : 0

  name                = "asuid.${trimsuffix(var.custom_domain.host_name, ".${var.custom_domain.dns.zone_name}")}"
  zone_name           = var.custom_domain.dns.zone_name
  resource_group_name = var.custom_domain.dns.zone_resource_group_name
  ttl                 = 300

  record {
    value = azurerm_container_app.this.custom_domain_verification_id
  }

  tags = local.tags
}

# Wait for DNS propagation before Azure attempts to validate the custom domain.
# Without this delay, Azure may fail to find the TXT record immediately after creation.
# Only needed for Azure-managed certificate provisioning.
resource "time_sleep" "dns_propagation" {
  count = var.custom_domain != null && try(var.custom_domain.dns, null) != null && var.custom_domain.certificate_id == null ? 1 : 0

  depends_on = [
    azurerm_dns_cname_record.this,
    azurerm_dns_txt_record.validation,
  ]

  create_duration = "60s"
}

# Request a free Azure-managed certificate for the custom domain.
# Azure validates domain ownership via the CNAME record and issues the certificate automatically.
# Uses the managedCertificates API since azurerm_container_app_environment_certificate only
# supports manually uploaded certificates.
resource "azapi_resource" "managed_certificate" {
  count     = var.custom_domain != null && var.custom_domain.certificate_id == null ? 1 : 0
  type      = "Microsoft.App/managedEnvironments/managedCertificates@2024-03-01"
  name      = "cert-${replace(var.custom_domain.host_name, ".", "-")}"
  parent_id = var.container_app_environment_id
  location  = var.environment.location

  body = {
    properties = {
      subjectName             = var.custom_domain.host_name
      domainControlValidation = "CNAME"
    }
  }

  tags = local.tags

  # The domain must be added to the container app before Azure can issue the managed cert.
  depends_on = [azurerm_container_app_custom_domain.this]
}

# Update the custom domain binding from Disabled to SniEnabled once the managed cert is ready.
# azurerm_container_app_custom_domain is kept in Disabled state with ignore_changes to avoid
# Terraform reverting this binding on subsequent applies.
resource "azapi_update_resource" "bind_certificate" {
  count       = var.custom_domain != null && var.custom_domain.certificate_id == null ? 1 : 0
  type        = "Microsoft.App/containerApps@2024-03-01"
  resource_id = azurerm_container_app.this.id

  body = {
    properties = {
      configuration = {
        ingress = {
          customDomains = [
            {
              bindingType   = "SniEnabled"
              certificateId = azapi_resource.managed_certificate[0].id
              name          = var.custom_domain.host_name
            }
          ]
        }
      }
    }
  }

  depends_on = [azapi_resource.managed_certificate]
}
