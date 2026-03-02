# repository

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                            | Version |
| --------------------------------------------------------------- | ------- |
| <a name="requirement_github"></a> [github](#requirement_github) | ~> 6.0  |

## Providers

| Name                                                      | Version |
| --------------------------------------------------------- | ------- |
| <a name="provider_github"></a> [github](#provider_github) | 6.11.1  |

## Modules

| Name                                                                                   | Source                                        | Version |
| -------------------------------------------------------------------------------------- | --------------------------------------------- | ------- |
| <a name="module_github_repository"></a> [github_repository](#module_github_repository) | pagopa-dx/github-environment-bootstrap/github | ~> 1.0  |

## Resources

| Name                                                                                                                                                      | Type     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [github_actions_secret.lets_encrypt_private_key](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret)        | resource |
| [github_actions_secret.lets_encrypt_registration](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret)       | resource |
| [github_actions_secret.slack_webhook_url](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret)               | resource |
| [github_repository_environment.automated_tests](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment) | resource |
| [github_repository_environment.npm_prod_cd](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment)     | resource |

## Inputs

No inputs.

## Outputs

| Name                                                                             | Description                       |
| -------------------------------------------------------------------------------- | --------------------------------- |
| <a name="output_repository_id"></a> [repository_id](#output_repository_id)       | The ID of the GitHub repository   |
| <a name="output_repository_name"></a> [repository_name](#output_repository_name) | The name of the GitHub repository |

<!-- END_TF_DOCS -->
