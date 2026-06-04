# DX - Azure Container APP

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-container-app/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-container-app%2Fazurerm%2Flatest)

This Terraform module deploys an Azure Container App in a provided Azure Container App Environment. It supports System Assigned Managed Identity and configurable scaling options.

## Diagram

The following diagram illustrates the architecture and relationships between the main components of this module:

![diagram](https://raw.githubusercontent.com/pagopa/dx/refs/heads/main/infra/modules/azure_container_app/diagram.svg)

## Features

- **Container App Deployment**: Deploys a containerized application in the specified Azure Container App Environment.
- **Flexible Ingress**: Configure external (public) or internal-only access via the `public_access_enabled` variable (default: `true`). Only effective when the parent Container App Environment has `public_network_access_enabled` set to `true`.
- **Custom Domain with Managed or Uploaded SSL**: Optionally bind a custom domain (e.g., `api.example.com`) via the `custom_domain` variable. Supports auto-provisioned Azure-managed certificates (provide `dns` block) or pre-uploaded certificates via `certificate_id`.
- **Private Endpoint Integration**: Creates a private DNS A record for the container app, enabling secure internal communication when `public_network_access_enabled` is set to `false`.
- **Managed Identity**: Provides System Assigned Managed Identity for secure authentication with Azure resources.
- **Health Probes**: Configurable liveness, readiness, and startup probes to monitor and ensure container health.
- **Ingress Configuration**: Supports secure ingress with options for external or internal access and target port configuration.
- **Dynamic Templates**: Allows defining multiple container templates with customizable settings, including environment variables and probes.
- **Revision Management**: Supports both `Single` and `Incremental` revision modes for managing application updates.

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

| Tier    | Description                       | CPU  | Memory | Replicas (Min-Max) |
| ------- | --------------------------------- | ---- | ------ | ------------------ |
| default | Low-load production environments. | 1.25 | 2.5Gi  | 1-8                |

### Allowed Sizes

The allowed sizes for the Container App are:

| CPU  | Memory |
| ---- | ------ |
| 0.25 | 0.5Gi  |
| 0.5  | 1Gi    |
| 0.75 | 1.5Gi  |
| 1    | 2Gi    |
| 1.25 | 2.5Gi  |
| 1.5  | 3Gi    |
| 1.75 | 3.5Gi  |
| 2    | 4Gi    |

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
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.14.0 |
| <a name="requirement_azapi"></a> [azapi](#requirement\_azapi) | ~> 2.9 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.70 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.10 |
| <a name="requirement_time"></a> [time](#requirement\_time) | ~> 0.14 |

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
| <a name="input_allow_access_from_environment_only"></a> [allow\_access\_from\_environment\_only](#input\_allow\_access\_from\_environment\_only) | If false (default), the Container App is accessible via public internet or within the VNet, depending on the Container App Environment configuration.<br/>If true, the Container App is accessible only from other apps on the same Container App Environment. | `bool` | `false` | no |
| <a name="input_authentication"></a> [authentication](#input\_authentication) | Azure Managed Authentication (EasyAuth) configuration using Microsoft Entra ID. When set, enables authentication on the Container App. Unauthenticated requests get redirected to the login page. client\_secret\_key\_vault\_id must be the versionless\_id of the KV secret; the module automatically adds it to the Container App secrets. | <pre>object({<br/>    azure_active_directory = object({<br/>      client_id                  = string<br/>      tenant_id                  = string<br/>      client_secret_key_vault_id = string<br/>    })<br/>  })</pre> | `null` | no |
| <a name="input_autoscaler"></a> [autoscaler](#input\_autoscaler) | Autoscaler configuration. It includes minimum and maximum replicas, and a list of scalers for Azure Queue, HTTP calls and Custom scaling rules. Custom scalers are available on Keda website at https://keda.sh/docs/latest/scalers/ | <pre>object({<br/>    replicas = optional(object({<br/>      minimum = number<br/>      maximum = number<br/>    }), null)<br/><br/>    azure_queue_scalers = optional(list(object({<br/>      queue_name   = string<br/>      queue_length = number<br/><br/>      authentication = object({<br/>        secret_name       = string<br/>        trigger_parameter = string<br/>      })<br/>    })), [])<br/><br/>    http_scalers = optional(list(object({<br/>      name                = string<br/>      concurrent_requests = number,<br/>    })), [])<br/><br/>    custom_scalers = optional(list(object({<br/>      name             = string<br/>      custom_rule_type = string<br/>      metadata         = map(string),<br/><br/>      authentication = optional(object({<br/>        secret_name       = string<br/>        trigger_parameter = string<br/>      }))<br/>    })), [])<br/>  })</pre> | `null` | no |
| <a name="input_container_app_environment_id"></a> [container\_app\_environment\_id](#input\_container\_app\_environment\_id) | The ID of the Azure Container App Environment where the container app will be deployed. | `string` | n/a | yes |
| <a name="input_container_port"></a> [container\_port](#input\_container\_port) | The port on which the container app will listen for incoming traffic. | `number` | `8080` | no |
| <a name="input_containers"></a> [containers](#input\_containers) | List of containers and related settings to be deployed in the same Container App.<br/>The second and subsequent containers in the list will be deployed as sidecars.<br/>Each container must specify an image, and can optionally specify a name (if not provided, a name will be generated from the image name), environment variables (app\_settings), secrets to be exposed (secret\_names) and liveness, readiness and startup probes.<br/>Probes are used by Azure to determine container health status and to automatically restart it if necessary.<br/>For more details on probe configuration, refer to https://learn.microsoft.com/en-us/azure/container-apps/containers#probes. | <pre>list(object({<br/>    image        = string<br/>    name         = optional(string, "")<br/>    app_settings = optional(map(string), {})<br/>    secret_names = optional(list(string), [])<br/><br/>    liveness_probe = object({<br/>      failure_count_threshold = optional(number, 3)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      initial_delay    = optional(number, 30)<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    })<br/><br/>    readiness_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds        = optional(number, 10)<br/>      initial_delay           = optional(number, 30)<br/>      path                    = string<br/>      success_count_threshold = optional(number, 3)<br/>      timeout                 = optional(number, 5)<br/>      transport               = optional(string, "HTTP")<br/>    }), null)<br/><br/>    startup_probe = optional(object({<br/>      failure_count_threshold = optional(number, 10)<br/>      header = optional(object({<br/>        name  = string<br/>        value = string<br/>      }))<br/>      interval_seconds = optional(number, 10)<br/>      path             = string<br/>      timeout          = optional(number, 5)<br/>      transport        = optional(string, "HTTP")<br/>    }), null)<br/>  }))</pre> | n/a | yes |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration for the container app. Provide 'certificate\_id' to use a pre-uploaded azurerm\_container\_app\_environment\_certificate, or 'dns' to auto-provision an Azure-managed certificate (CNAME and TXT records are created automatically). At least one of 'certificate\_id' or 'dns' must be specified. | <pre>object({<br/>    host_name      = string<br/>    certificate_id = optional(string)<br/>    dns = optional(object({<br/>      zone_name                = string<br/>      zone_resource_group_name = string<br/>    }))<br/>  })</pre> | `null` | no |
| <a name="input_deployment_strategy"></a> [deployment\_strategy](#input\_deployment\_strategy) | The strategy for new deployments.<br/>With `Incremental`, the new version the gradually deployed until it reaches the 100% of the traffic.<br/>Optionally, you can provide a script to monitor specific APIs during this phase and using automatic rollbacks in case of issues.<br/>With `Latest`, the new version immediately replaces the previous one as soon as it becomes responsive and required number of replicas are provisioned, with no gradual deployment. | `string` | `"Incremental"` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The ID of the Log Analytics workspace to send diagnostics to.<br/>Mandatory for use cases other than 'development'. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the Azure Resource Group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_secrets"></a> [secrets](#input\_secrets) | List of Key Vault secret references to define in the Container App.<br/>Secrets are exposed to containers only when explicitly referenced in `containers[*].secret_names`.<br/>To remove a secret without downtime, first deploy the application version that no longer needs it, then remove it from every container `secret_names` list, and finally remove it from `secrets`. | <pre>list(object({<br/>    name                = string<br/>    key_vault_secret_id = string<br/>  }))</pre> | `[]` | no |
| <a name="input_size"></a> [size](#input\_size) | Container app memory and cpu sizes. For allowed values consult table at https://learn.microsoft.com/en-us/azure/container-apps/containers#allocations. If not set, it will be determined by the use\_case. | <pre>object({<br/>    cpu    = number<br/>    memory = string<br/>  })</pre> | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Container app use case. Allowed values: 'default', 'development' | `string` | `"default"` | no |
| <a name="input_user_assigned_identity_id"></a> [user\_assigned\_identity\_id](#input\_user\_assigned\_identity\_id) | Id of a user-assigned managed identity.<br/>If provided, the Container App will use this identity along with the system-assigned. | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_custom_domain"></a> [custom\_domain](#output\_custom\_domain) | Custom domain binding. Only populated if the 'custom\_domain' variable was provided. |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Container App resource. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Container App resource. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the system-assigned managed identity associated with this Container App. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the Azure Resource Group where the Container App is deployed. |
| <a name="output_url"></a> [url](#output\_url) | The URL of the Container App. |
| <a name="output_url_latest_revision"></a> [url\_latest\_revision](#output\_url\_latest\_revision) | The URL of the latest revision deployed Container App. |
<!-- END_TF_DOCS -->
