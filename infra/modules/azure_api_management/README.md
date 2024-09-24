# DX - Azure APIM

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.7.5 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management) | resource |
| [azurerm_api_management_api.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api) | resource |
| [azurerm_api_management_api_operation_policy.api_operation_policy](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_operation_policy) | resource |
| [azurerm_api_management_api_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_api_policy) | resource |
| [azurerm_api_management_certificate.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_certificate) | resource |
| [azurerm_api_management_diagnostic.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_diagnostic) | resource |
| [azurerm_api_management_logger.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_logger) | resource |
| [azurerm_api_management_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_policy) | resource |
| [azurerm_api_management_product.apim_product](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product) | resource |
| [azurerm_api_management_product_api.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product_api) | resource |
| [azurerm_api_management_product_group.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product_group) | resource |
| [azurerm_api_management_product_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_product_policy) | resource |
| [azurerm_management_lock.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |
| [azurerm_monitor_diagnostic_setting.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_network_security_group.nsg_apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group) | resource |
| [azurerm_private_dns_a_record.apim_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_dns_a_record.apim_management_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_dns_a_record.apim_scm_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_dns_zone_virtual_network_link.azure_api_link](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_private_dns_zone_virtual_network_link.management_api_link](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_private_dns_zone_virtual_network_link.scm_apim_link](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_zone_virtual_network_link) | resource |
| [azurerm_subnet_network_security_group_association.snet_nsg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association) | resource |
| [azurerm_key_vault_certificate.key_vault_certificate](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_certificate) | data source |
| [azurerm_private_dns_zone.azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.management_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.scm_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action"></a> [action](#input\_action) | The ID of the Action Group and optional map of custom string properties to include with the post webhook operation. | <pre>set(object(<br>    {<br>      action_group_id = string<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_alerts_enabled"></a> [alerts\_enabled](#input\_alerts\_enabled) | Should Metrics Alert be enabled? | `bool` | `true` | no |
| <a name="input_apis"></a> [apis](#input\_apis) | n/a | <pre>list(object({<br>    api_version                      = optional(string, null) # The Version number of this API, if this API is versioned<br>    oauth2_authorization_server_name = optional(string, null)<br>    revision                         = optional(string, 1)<br>    revision_description             = optional(string, null)<br>    display_name                     = string<br>    description                      = optional(string, null)<br>    api_type                         = optional(string, "http") # (Optional) Type of API. Possible values are graphql, http, soap, and websocket. Defaults to http<br>    path                             = string<br>    protocols                        = list(string)<br>    service_url                      = string<br>    subscription_required            = optional(bool, false)            # Should this API require a subscription key?<br>    version_set_id                   = optional(string, null)           # The ID of the Version Set which this API is associated with<br>    content_format                   = optional(string, "swagger-json") # The format of the content from which the API Definition should be imported<br>    content_value                    = string                           # The Content from which the API Definition should be imported<br>    subscription_key_names = optional(object({                          # Override the default name of the header and query string containing the subscription key header<br>      header = string<br>      query  = string<br>    }), null)<br>    xml_content = optional(string, null)<br>    api_operation_policies = optional(list(object({ # List of api policy for given operation<br>      operation_id = string<br>      xml_content  = string<br>      }<br>    )), [])<br>  }))</pre> | n/a | yes |
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | Application Insights integration The instrumentation key used to push data | <pre>object({<br>    enabled             = bool<br>    instrumentation_key = string<br>  })</pre> | <pre>{<br>  "enabled": false,<br>  "instrumentation_key": null<br>}</pre> | no |
| <a name="input_autoscale"></a> [autoscale](#input\_autoscale) | Configure Apim autoscale rule on capacity metric | <pre>object(<br>    {<br>      enabled                       = bool<br>      default_instances             = number<br>      minimum_instances             = number<br>      maximum_instances             = number<br>      scale_out_capacity_percentage = number<br>      scale_out_time_window         = string<br>      scale_out_value               = string<br>      scale_out_cooldown            = string<br>      scale_in_capacity_percentage  = number<br>      scale_in_time_window          = string<br>      scale_in_value                = string<br>      scale_in_cooldown             = string<br>    }<br>  )</pre> | <pre>{<br>  "default_instances": 1,<br>  "enabled": true,<br>  "maximum_instances": 5,<br>  "minimum_instances": 1,<br>  "scale_in_capacity_percentage": 30,<br>  "scale_in_cooldown": "PT30M",<br>  "scale_in_time_window": "PT30M",<br>  "scale_in_value": "1",<br>  "scale_out_capacity_percentage": 60,<br>  "scale_out_cooldown": "PT45M",<br>  "scale_out_time_window": "PT10M",<br>  "scale_out_value": "2"<br>}</pre> | no |
| <a name="input_certificate_names"></a> [certificate\_names](#input\_certificate\_names) | List of key vault certificate name | `list(string)` | `[]` | no |
| <a name="input_diagnostic_always_log_errors"></a> [diagnostic\_always\_log\_errors](#input\_diagnostic\_always\_log\_errors) | Always log errors. Send telemetry if there is an erroneous condition, regardless of sampling settings. | `bool` | `true` | no |
| <a name="input_diagnostic_backend_request"></a> [diagnostic\_backend\_request](#input\_diagnostic\_backend\_request) | Number of payload bytes to log (up to 8192) and a list of headers to log, min items: 0, max items: 1 | <pre>set(object(<br>    {<br>      body_bytes     = number<br>      headers_to_log = set(string)<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_diagnostic_backend_response"></a> [diagnostic\_backend\_response](#input\_diagnostic\_backend\_response) | Number of payload bytes to log (up to 8192) and a list of headers to log, min items: 0, max items: 1 | <pre>set(object(<br>    {<br>      body_bytes     = number<br>      headers_to_log = set(string)<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_diagnostic_frontend_request"></a> [diagnostic\_frontend\_request](#input\_diagnostic\_frontend\_request) | Number of payload bytes to log (up to 8192) and a list of headers to log, min items: 0, max items: 1 | <pre>set(object(<br>    {<br>      body_bytes     = number<br>      headers_to_log = set(string)<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_diagnostic_frontend_response"></a> [diagnostic\_frontend\_response](#input\_diagnostic\_frontend\_response) | Number of payload bytes to log (up to 8192) and a list of headers to log, min items: 0, max items: 1 | <pre>set(object(<br>    {<br>      body_bytes     = number<br>      headers_to_log = set(string)<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_diagnostic_http_correlation_protocol"></a> [diagnostic\_http\_correlation\_protocol](#input\_diagnostic\_http\_correlation\_protocol) | The HTTP Correlation Protocol to use. Possible values are None, Legacy or W3C. | `string` | `"W3C"` | no |
| <a name="input_diagnostic_log_client_ip"></a> [diagnostic\_log\_client\_ip](#input\_diagnostic\_log\_client\_ip) | Log client IP address. | `bool` | `true` | no |
| <a name="input_diagnostic_sampling_percentage"></a> [diagnostic\_sampling\_percentage](#input\_diagnostic\_sampling\_percentage) | Sampling (%). For high traffic APIs, please read the documentation to understand performance implications and log sampling. Valid values are between 0.0 and 100.0. | `number` | `5` | no |
| <a name="input_diagnostic_verbosity"></a> [diagnostic\_verbosity](#input\_diagnostic\_verbosity) | Logging verbosity. Possible values are verbose, information or error. | `string` | `"error"` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_hostname_configuration"></a> [hostname\_configuration](#input\_hostname\_configuration) | Custom domains | <pre>object({<br><br>    proxy = list(object(<br>      {<br>        default_ssl_binding = bool<br>        host_name           = string<br>        key_vault_id        = string<br>    }))<br><br>    management = object({<br>      host_name    = string<br>      key_vault_id = string<br>    })<br><br>    portal = object({<br>      host_name    = string<br>      key_vault_id = string<br>    })<br><br>    developer_portal = object({<br>      host_name    = string<br>      key_vault_id = string<br>    })<br><br>  })</pre> | `null` | no |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Key vault id. | `string` | `null` | no |
| <a name="input_lock_enable"></a> [lock\_enable](#input\_lock\_enable) | Apply lock to block accedentaly deletions. | `bool` | `false` | no |
| <a name="input_management_logger_applicaiton_insight_enabled"></a> [management\_logger\_applicaiton\_insight\_enabled](#input\_management\_logger\_applicaiton\_insight\_enabled) | (Optional) if false, disables management logger application insight block | `bool` | `true` | no |
| <a name="input_metric_alerts"></a> [metric\_alerts](#input\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br>    description = string<br>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br>    frequency = string<br>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br>    window_size = string<br>    # Possible values are 0, 1, 2, 3.<br>    severity = number<br>    # Possible values are true, false<br>    auto_mitigate = bool<br><br>    criteria = set(object(<br>      {<br>        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br>        aggregation = string<br>        dimension = list(object(<br>          {<br>            name     = string<br>            operator = string<br>            values   = list(string)<br>          }<br>        ))<br>        metric_name      = string<br>        metric_namespace = string<br>        # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br>        operator               = string<br>        skip_metric_validation = bool<br>        threshold              = number<br>      }<br>    ))<br><br>    dynamic_criteria = set(object(<br>      {<br>        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br>        aggregation       = string<br>        alert_sensitivity = string<br>        dimension = list(object(<br>          {<br>            name     = string<br>            operator = string<br>            values   = list(string)<br>          }<br>        ))<br>        evaluation_failure_count = number<br>        evaluation_total_count   = number<br>        ignore_data_before       = string<br>        metric_name              = string<br>        metric_namespace         = string<br>        operator                 = string<br>        skip_metric_validation   = bool<br>      }<br>    ))<br>  }))</pre> | `{}` | no |
| <a name="input_notification_sender_email"></a> [notification\_sender\_email](#input\_notification\_sender\_email) | Email address from which the notification will be sent. | `string` | `null` | no |
| <a name="input_products"></a> [products](#input\_products) | (Optional) List of products to create | <pre>list(object({<br>    id           = string<br>    display_name = string<br>    description  = string<br>    groups       = optional(list(string))<br>    xml_policy   = optional(string)<br>  }))</pre> | `[]` | no |
| <a name="input_publisher_email"></a> [publisher\_email](#input\_publisher\_email) | The email of publisher/company. | `string` | n/a | yes |
| <a name="input_publisher_name"></a> [publisher\_name](#input\_publisher\_name) | The name of publisher/company. | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_sec_log_analytics_workspace_id"></a> [sec\_log\_analytics\_workspace\_id](#input\_sec\_log\_analytics\_workspace\_id) | Log analytics workspace security (it should be in a different subscription). | `string` | `null` | no |
| <a name="input_sec_storage_id"></a> [sec\_storage\_id](#input\_sec\_storage\_id) | Storage Account security (it should be in a different subscription). | `string` | `null` | no |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | The id of the subnet that will be used for the API Management. | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 'test', 'standard', 'premium'. | `string` | `"test"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network in which to create the subnet | <pre>object({<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_virtual_network_type_internal"></a> [virtual\_network\_type\_internal](#input\_virtual\_network\_type\_internal) | The type of virtual network you want to use, if true it will be Internal and you need to specify a subnet\_id, otherwise it will be None | `bool` | `true` | no |
| <a name="input_xml_content"></a> [xml\_content](#input\_xml\_content) | Xml content for all api policy | `string` | `null` | no |
| <a name="input_zones"></a> [zones](#input\_zones) | List of availability zones (supported only for Premium SKU) | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_diagnostic_id"></a> [diagnostic\_id](#output\_diagnostic\_id) | n/a |
| <a name="output_gateway_hostname"></a> [gateway\_hostname](#output\_gateway\_hostname) | n/a |
| <a name="output_gateway_url"></a> [gateway\_url](#output\_gateway\_url) | n/a |
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_logger_id"></a> [logger\_id](#output\_logger\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | n/a |
| <a name="output_private_ip_addresses"></a> [private\_ip\_addresses](#output\_private\_ip\_addresses) | n/a |
| <a name="output_product_ids"></a> [product\_ids](#output\_product\_ids) | Products |
| <a name="output_public_ip_addresses"></a> [public\_ip\_addresses](#output\_public\_ip\_addresses) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
