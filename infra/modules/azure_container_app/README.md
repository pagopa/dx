# DX - Azure Container APP

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-container-app/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-container-app%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Container App in a provided Azure Container App Environment. It supports System Assigned Managed Identity and configurable scaling options.

## Features

- **Container App Deployment**: Deploys a containerized application in the specified Azure Container App Environment.
- **Flexible Ingress**: Configure external (public) or internal-only access via the `external_enabled` variable. Public access is enabled by default, but only becomes effective when the parent Container App Environment has `internal_load_balancer_enabled` set to false.
- **Custom Domain with Managed SSL**: Optionally bind a custom domain (e.g., api.example.com) with Azure-managed SSL certificate via the `custom_domain_name` variable. Users simply provide the domain name and create a CNAME DNS record to enable HTTPS traffic.
- **Private Endpoint Integration**: Creates a private DNS A record for the container app, enabling secure internal communication.
- **Managed Identity**: Provides System Assigned Managed Identity for secure authentication with Azure resources.
- **Health Probes**: Configurable liveness, readiness, and startup probes to monitor and ensure container health.
- **Ingress Configuration**: Supports secure ingress with options for external or internal access and target port configuration.
- **Dynamic Templates**: Allows defining multiple container templates with customizable settings, including environment variables and probes.
- **Revision Management**: Supports both `Single` and `Multiple` revision modes for managing application updates.

## Custom Domain Setup

To use a custom domain with HTTPS:

1. Provide the `custom_domain` variable with the domain name and (optionally) the Azure DNS zone details
2. If `dns` is provided, the module automatically creates:
   - A **CNAME record** pointing the custom domain to the container app FQDN
   - A **TXT validation record** (`asuid.<subdomain>`) with the app's domain verification ID
3. Azure validates the DNS and provisions a managed SSL certificate automatically
4. Your app will be accessible at `https://api.example.com`

**With automatic DNS records (recommended):**
```hcl
custom_domain = {
  host_name = "api.example.com"
  dns = {
    zone_name                = "example.com"
    zone_resource_group_name = "rg-dns"
  }
}
```

**Without DNS management (manual CNAME setup):**
```hcl
custom_domain = {
  host_name = "api.example.com"
}
```
In this case, create a CNAME record manually: `api.example.com` → `url` output, and a TXT record `asuid.api` → `custom_domain_verification_id` attribute of the container app.

## Use cases Comparison

| Tier    | Description                                                    | CPU   | Memory | Replicas (Min-Max) |
|---------|----------------------------------------------------------------|-------|--------|--------------------|
| default | Low-load production environments.                              | 1.25  | 2.5Gi  | 1-8                |

### Allowed Sizes

The allowed sizes for the Container App are:

| CPU   | Memory  |
|-------|---------|
| 0.25  | 0.5Gi   |
| 0.5   | 1Gi     |
| 0.75  | 1.5Gi   |
| 1     | 2Gi     |
| 1.25  | 2.5Gi   |
| 1.5   | 3Gi     |
| 1.75  | 3.5Gi   |
| 2     | 4Gi     |

Accordingly to the [documentation](https://learn.microsoft.com/en-us/azure/container-apps/containers#allocations).

## Autoscaling

The module can scale dynamically the instance number from 0 to 1000, according to various metrics:

- Browse available rules on the [Keda website](https://keda.sh/docs/latest/scalers/).
- Set the desired scalers via the `autoscaler.custom_scalers` variable. Use the `metadata` field to pass required parameters for each scaler.

The range of instances is set automatically according to the chosen tier, however it can be overridden by the `autoscaler.replicas` variable, which allows you to set a custom minimum and maximum number of replicas

Moreover, the Container App Service adds a couple of built-in scalers:

- HTTP scaler: scales the number of instances based on the HTTP traffic received by the Container App
- Azure Queue scaler: scales the number of instances based on the number of messages in an Azure Storage Queue

### Autoscaling Authentication

Autoscalers can authenticate with external services using Managed Identity or connection strings.

- **Managed Identity**: [Currently supported](https://learn.microsoft.com/en-us/azure/container-apps/scale-app?pivots=azure-cli#authentication-2) for Azure Queue Storage, Service Bus, and Event Hub only. Moreover, it must be configured manually as not currently supported by Terraform.
- **Connection String**: Use the `authentication` object:
  - `secret_name`: Name of the secret holding the connection string (must also be stored as a secret in the Container App)
  - `trigger_parameter`: Name of the authentication parameter expected by the autoscaler (see Keda docs for each scaler)

### Example of an Autoscaler Configuration with Authentication

The following is an example of how to configure the [Azure Blob Storage scaler](https://keda.sh/docs/2.17/scalers/azure-storage-blob). Note, it uses [`connection`](https://keda.sh/docs/2.17/scalers/azure-storage-blob/#authentication-parameters) to tell the scaler where the connection string is stored:

```hcl
custom_scalers = [{
  name             = "scaler-on-my-blob-storage"
  custom_rule_type = "azure-blob"
  metadata = {
    blobContainerName = "my-container"
    accountName       = "myaccount"
    blobCount         = "5"
  }
  authentication = {
    secret_name       = "blob-connection-string-in-container-app-secrets"
    trigger_parameter = "connection"
  }
}]
```

---

## Usage Example

A complete usage example can be found in the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-container-app/tree/main/examples/complete) directory.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azapi"></a> [azapi](#requirement\_azapi) | >= 2.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.16.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |
| <a name="requirement_time"></a> [time](#requirement\_time) | >= 0.9 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azapi_resource.auth](https://registry.terraform.io/providers/azure/azapi/latest/docs/resources/resource) | resource |
| [azapi_resource.managed_certificate](https://registry.terraform.io/providers/azure/azapi/latest/docs/resources/resource) | resource |
| [azapi_update_resource.bind_certificate](https://registry.terraform.io/providers/azure/azapi/latest/docs/resources/update_resource) | resource |
| [azurerm_container_app.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app) | resource |
| [azurerm_container_app_custom_domain.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_custom_domain) | resource |
| [azurerm_dns_cname_record.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record) | resource |
| [azurerm_dns_txt_record.validation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_monitor_diagnostic_setting.container_app](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [time_sleep.dns_propagation](https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_acr_registry"></a> [acr\_registry](#input\_acr\_registry) | Indicates the Azure Container Registry to pull images from. Use this variable only if the registry service is an Azure Container Registry. Value must match the registry specified in the image name. | `string` | `null` | no |
| <a name="input_auth"></a> [auth](#input\_auth) | Azure Managed Authentication (EasyAuth) configuration using Microsoft Entra ID. When set, enables authentication on the Container App. Unauthenticated requests get redirected to the login page. client\_secret\_key\_vault\_id must be the versionless\_id of the KV secret; the module automatically adds it to the Container App secrets. | <pre>object({<br/>    azure_active_directory = object({<br/>      client_id                  = string<br/>      tenant_id                  = string<br/>      client_secret_key_vault_id = optional(string)<br/>    })<br/>  })</pre> | `null` | no |
| <a name="input_autoscaler"></a> [autoscaler](#input\_autoscaler) | Autoscaler configuration. It includes minimum and maximum replicas, and a list of scalers for Azure Queue, HTTP calls and Custom scaling rules. Custom scalers are available on Keda website at https://keda.sh/docs/latest/scalers/ | <pre>object({<br/>    replicas = optional(object({<br/>      minimum = number<br/>      maximum = number<br/>    }), null)<br/><br/>    azure_queue_scalers = optional(list(object({<br/>      queue_name   = string<br/>      queue_length = number<br/><br/>      authentication = object({<br/>        secret_name       = string<br/>        trigger_parameter = string<br/>      })<br/>    })), [])<br/><br/>    http_scalers = optional(list(object({<br/>      name                = string<br/>      concurrent_requests = number,<br/>    })), [])<br/><br/>    custom_scalers = optional(list(object({<br/>      name             = string<br/>      custom_rule_type = string<br/>      metadata         = map(string),<br/><br/>      authentication = optional(object({<br/>        secret_name       = string<br/>        trigger_parameter = string<br/>      }))<br/>    })), [])<br/>  })</pre> | `null` | no |
| <a name="input_container_app_environment_id"></a> [container\_app\_environment\_id](#input\_container\_app\_environment\_id) | The ID of the Azure Container App Environment where the container app will be deployed. | `string` | n/a | yes |
| <a name="input_container_app_templates"></a> [container\_app\_templates](#input\_container\_app\_templates) | List of containers to be deployed in the Container App. Each container can have its own settings, including liveness, readiness and startup probes. The image name is mandatory, while the name is optional. If not provided, the image name will be used as the container name. | <pre>list(object({<br/>    image        = string<br/>    name         = optional(string, "")<br/>    app_settings = optional(map(string), {})<br/><br/>    liveness_probe = object({<br/>      failure_count_threshold = optional(number, 3)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      initial_delay    = optional(number, 30)<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    })<br/><br/>    readiness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds        = optional(number, 10)<br/>      initial_delay           = optional(number, 30)<br/>      path                    = string<br/>      success_count_threshold = optional(number, 3)<br/>      timeout                 = optional(number, 5)<br/>      transport               = optional(string, "HTTP")<br/>    }), null)<br/><br/>    startup_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), null)<br/>  }))</pre> | n/a | yes |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration for the container app. If 'dns' is provided, CNAME and TXT validation records are created automatically in the specified Azure DNS zone. Otherwise, DNS records must be created manually. | <pre>object({<br/>    host_name = string<br/>    dns = optional(object({<br/>      zone_name                = string<br/>      zone_resource_group_name = string<br/>    }))<br/>  })</pre> | `null` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Diagnostic settings for Container App logs and metrics. When enabled, sends diagnostics to Log Analytics workspace and/or Storage Account. | <pre>object({<br/>    enabled                    = bool<br/>    log_analytics_workspace_id = optional(string, null)<br/>    storage_account_id         = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_external_enabled"></a> [external\_enabled](#input\_external\_enabled) | If true, the container app is accessible via a public FQDN. If false (default), the app is only accessible from within the virtual network. Only effective when the parent Container App Environment has public\_network\_access\_enabled set to true. | `bool` | `false` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the Azure Resource Group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_revision_mode"></a> [revision\_mode](#input\_revision\_mode) | The revision mode for the container app. Valid values are 'Single' and 'Multiple'. | `string` | `"Multiple"` | no |
| <a name="input_secrets"></a> [secrets](#input\_secrets) | A list of Key Vault secret references to be used as environment variables in the container app. | <pre>list(object({<br/>    name                = string<br/>    key_vault_secret_id = string<br/>  }))</pre> | `[]` | no |
| <a name="input_size"></a> [size](#input\_size) | Container app memory and cpu sizes. For allowed values consult table at https://learn.microsoft.com/en-us/azure/container-apps/containers#allocations. If not set, it will be determined by the use\_case. | <pre>object({<br/>    cpu    = number<br/>    memory = string<br/>  })</pre> | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_target_port"></a> [target\_port](#input\_target\_port) | The port on which the container app will listen for incoming traffic. | `number` | `8080` | no |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Container app use case. Allowed values: 'default'. | `string` | `"default"` | no |
| <a name="input_user_assigned_identity_id"></a> [user\_assigned\_identity\_id](#input\_user\_assigned\_identity\_id) | Id of the user-assigned managed identity created along with the Container App Environment. This is necessary to give identity roles (e.g. KeyVault access) to the Container App. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_custom_domain"></a> [custom\_domain](#output\_custom\_domain) | Custom domain binding. Only populated if the 'custom\_domain' variable was provided. |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Container App resource. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Container App resource. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the system-assigned managed identity associated with this Container App. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Container App is deployed. |
| <a name="output_url"></a> [url](#output\_url) | The URL of the Container App. |
<!-- END_TF_DOCS -->
