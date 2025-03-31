---
sidebar_label: Using DX Azure Terraform Provider
sidebar_position: 1
---

# Using DX Azure Terraform Provider

The DX Azure Terraform provider simplifies the creation and management of Azure
resources by enforcing standardized naming conventions and configurations. This
provider is maintained by the [PagoPA organization](https://github.com/pagopa)
and is available in the Terraform Registry under the namespace
[pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx).

:::note

This documentation is relevant for all individual contributors using the DX
Azure Terraform provider.

:::

## Why Use the DX Azure Provider?

The DX Azure provider offers several advantages for managing Azure resources:

- **Consistency**: Ensures resources follow a unified naming convention,
  reducing errors and improving maintainability.
- **Ease of Use**: Abstracts complex configurations into reusable functions,
  simplifying resource creation.
- **Integration**: Seamlessly integrates with Terraform workflows and pipelines,
  enabling efficient infrastructure management.

## Installation

To use the DX Azure provider, include it in your Terraform configuration as
follows:

```hcl
terraform {
  required_providers {
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }
}

provider "dx" {}
```

### Provider Configuration

The DX Azure provider accepts the following inputs (all currently optional):

| Name          | Type   | Required | Description                          |
| ------------- | ------ | -------- | ------------------------------------ |
| `prefix`      | String | No       | Two-character project prefix.        |
| `environment` | String | No       | Deployment environment (d, u, or p). |
| `location`    | String | No       | Deployment location (itn or weu).    |
| `domain`      | String | No       | Optional domain for naming.          |

## Functions

The DX Azure provider includes a `resource_name` function to generate
standardized resource names.

### resource_name Function

Generates a resource name based on the standardized prefix and additional
parameters.

#### Inputs

| Name              | Type    | Required | Description                                                                                                                                                                                                       |
| ----------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prefix`          | String  | Yes      | Prefix that defines the repository domain.                                                                                                                                                                        |
| `environment`     | String  | Yes      | Deployment environment (d, u, or p).                                                                                                                                                                              |
| `location`        | String  | Yes      | Deployment location (itn or weu).                                                                                                                                                                                 |
| `domain`          | String  | No       | Optional value specifying the domain.                                                                                                                                                                             |
| `name`            | String  | Yes      | Name of the resource.                                                                                                                                                                                             |
| `resource_type`   | String  | Yes      | Type of the resource. The list of supported resource types can be found in the [documentation table](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/functions/resource_name#resource-types). |
| `instance_number` | Integer | Yes      | Instance number of the resource.                                                                                                                                                                                  |

#### Example

```hcl
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    domain = "test",
    name = "app",
    resource_type = "api_management",
    instance_number = 1,
  })
}
```

**Output**: `dx-d-itn-app-apim-pep-01`

:::note

To call a function, use the syntax:
`provider::PROVIDER_NAME::FUNCTION_NAME(...)`.

:::

## Semantic Versioning

The DX Azure provider follows [semantic versioning](https://semver.org/), which
ensures compatibility and stability across updates. When specifying the provider
version in your Terraform configuration, use the `~>` operator to allow updates
within the same major version:

```hcl
version = "~> 0.0"
```

This ensures that breaking changes are avoided while allowing minor updates and
patches. For example:

- `~> 0.0` allows updates to `0.0.x` but not `0.1.0`.
- `~> 1.0` allows updates to `1.x.x` but not `2.0.0`.

When publishing a new release, ensure the version tag starts with a `v` (e.g.,
`v0.1.0`) as required by the
[Terraform Registry](https://developer.hashicorp.com/terraform/registry/providers/publishing#creating-a-github-release).

## Publishing and Releasing the Provider

The DX Azure provider is maintained in the main repository (`dx`) and is
automatically pushed to its subrepository and released on the Terraform Registry
using GitHub Actions workflows.

### Subrepository Push Workflow

The `push_provider_to_subrepo.yaml` workflow ensures that changes to the
provider in the `infra/provider` directory of the main repository (`dx`) are
pushed to its dedicated subrepository (e.g.,
[terraform-provider-azure](https://github.com/pagopa-dx/terraform-provider-azure)).
This workflow is triggered on changes to the `main` branch.

### Release Workflow

The release workflow is located in the `infra/provider/.github/workflows`
directory of the main repository (`dx`) and must be maintained there. It is
executed in the subrepository of the provider after the changes are pushed. This
workflow automates the release process by creating a new release when a tag
matching the pattern `v*` (e.g., `v0.1.0`) is pushed. The release process
includes:

1. Fetching the repository.
2. Importing the GPG key for signing.
3. Running GoReleaser to build and publish the provider.

### Configuring the GPG Key

A GPG key is used to cryptographically sign the release, ensuring its
authenticity and integrity. The secrets required for this process
(`GPG_PRIVATE_KEY` and `PASSPHRASE`) must be configured in the subrepository
(e.g.,
[terraform-provider-azure](https://github.com/pagopa-dx/terraform-provider-azure))
under the repository settings.

Additionally, the **public key** associated with the GPG key must be added to
the Terraform Registry account. This step is necessary to verify the
authenticity of the provider during publication.

For more details, refer to the
[official Terraform documentation](https://developer.hashicorp.com/terraform/registry/providers/publishing#creating-a-github-release).

### Manual Release Steps

If you need to manually trigger a release:

1. Create a new tag in the format `vX.Y.Z` (e.g., `v0.1.0`).
2. Push the tag to the subrepository:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. The release workflow in the subrepository will automatically handle the rest.

## Testing Local Changes

If you need to make changes to the DX Azure provider and test them locally,
follow these steps:

### Step 1: Clone the Subrepository

Clone the subrepository for the DX Azure provider:

```bash
git clone https://github.com/pagopa-dx/terraform-provider-azure.git
cd terraform-provider-azure
```

### Step 2: Build the Provider

Run the following commands in the main directory of the cloned repository to
install dependencies, tidy up the module, and build the provider:

```bash
go mod tidy
go build -o terraform-provider-azure
```

This will generate the `terraform-provider-azure` binary in the current
directory.

### Step 3: Configure `.terraformrc`

To use the locally built provider, you need to override the default provider
installation by adding an entry to your `.terraformrc` file. Create or update
the file in your home directory (`~/.terraformrc`) with the following content:

```hcl
provider_installation {
  dev_overrides {
    "local-pagopa-dx/azure" = "/path/to/terraform-provider-azure"
  }
  direct {}
}
```

Replace `/path/to/terraform-provider-azure` with the absolute path to the
directory where you built the provider.

### Step 4: Update Your Terraform Configuration

In your Terraform configuration, update the `source` field to match the override
key in `.terraformrc`:

```hcl
terraform {
  required_providers {
    dx = {
      source  = "local-pagopa-dx/azure"
    }
  }
}
```

### Step 5: Test the Provider

Run `terraform init` in your Terraform project directory to initialize the
provider. Terraform will use the locally built provider instead of downloading
it from the registry.

```bash
terraform init
terraform plan
```

You can now test your changes locally. Once you are satisfied with the results,
push your changes to the subrepository and follow the release process described
above.

:::note

Remember to remove or comment out the `.terraformrc` override and restore the
`source` field in your Terraform configuration to the original value
(`pagopa-dx/azure`) before deploying to production.

:::

## Troubleshooting Common Issues

### Invalid Resource Type

If the `resource_name` function returns an error for an invalid resource type,
refer to the
[official list](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/functions/resource_name#resource-types)
of supported resource types.

### Build Issues

If the provider build fails, try the following steps:

1. Before `tidy` and `build`, run the following command in the main directory of
   the provider to ensure all dependencies are installed:

   ```bash
   go install .
   ```

2. If the build still fails, ensure the binary is executable by running:

   ```bash
   chmod +x terraform-provider-azure
   ```

3. If the issue persists, it might be related to your machine's architecture.
   Use the following command to specify the architecture and operating system
   for the build:

   ```bash
   GOARCH=arm64 GOOS=darwin go build -o terraform-provider-azure
   ```

   Adjust `GOARCH` and `GOOS` based on your machine's architecture and operating
   system. For example:

   - For macOS with an ARM64 processor: `GOARCH=arm64 GOOS=darwin`
   - For Linux with an AMD64 processor: `GOARCH=amd64 GOOS=linux`

4. Retry the build process after applying the appropriate configuration.

### Pipeline Failures

If the subrepository push workflow fails:

1. Verify the `github_pat` secret is correctly configured.
2. Ensure the `name` and `repo_type` inputs in the workflow are accurate.

## Useful Documentation

Here are some useful links to help you understand and work with Terraform
providers and the DX Azure provider:

- [Publishing Providers to the Terraform Registry](https://developer.hashicorp.com/terraform/registry/providers/publishing):
  Official guide for publishing providers to the Terraform Registry.
- [Generating a New GPG Key](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key):
  Instructions for generating a new GPG key for signing commits and releases.
- [Preparing and Adding a Signing Key](https://developer.hashicorp.com/terraform/registry/providers/publishing#preparing-and-adding-a-signing-key):
  Steps to prepare and add a GPG signing key for Terraform Registry.
- [Terraform Providers](https://developer.hashicorp.com/terraform/plugin/framework/providers):
  Documentation on creating and managing providers.
- [Terraform Functions](https://developer.hashicorp.com/terraform/plugin/framework/functions):
  Guide for implementing custom functions in Terraform providers.

## Getting Support

For assistance with the DX Azure provider:

- Join the `#team_devex_help` channel for direct support.
- Provide specific error messages or logs when seeking help.
- Share your Terraform configuration and provider setup details.

The DX Azure provider is designed to simplify and standardize Azure resource
management. Don't hesitate to reach out for help as you integrate it into your
workflows.