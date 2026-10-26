## 2.2.0 (2026-10-22)

### 🚀 Features

- Always create a dedicated token-only OIDC role and the repository-level ECR_PUBLIC_ROLE_ARN secret in the AWS bootstrap. Ignore subsequent secret value changes to avoid ARN churn between environment states. Initial creation can overwrite an existing secret, and destroying an instance can delete the shared secret; coordinate creation, role rotation and retirement across states. ECR Public authentication still requires organization policies to permit us-east-1. Validation uses only the official AWS authentication actions, with optional non-blocking login; it does not clear pre-existing Docker credentials, which must be managed on self-hosted runners. ([#2388](https://github.com/pagopa/dx/pull/2388))

  Grant sts:GetServiceBearerToken without a service-name condition, matching the documented AWS ECR Public policy and avoiding a condition-dependent implicit Deny. The role still grants only the two token actions; bearer-token permission is no longer limited to ECR Public, and no repository write or additional service API permissions are added.

### ❤️ Thank You

- Christian Calabrese

## 2.1.2 (2026-10-15)

### 🩹 Fixes

- Restore the canonical DX ModuleName tag using the name in project.json, shared with Nx, instead of deriving it from the Terraform installation directory. ([#2364](https://github.com/pagopa/dx/pull/2364))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 2.1.1 (2026-10-05)

### 🩹 Fixes

- Update the CodeBuild self-hosted runner dependency to version 3. ([#2256](https://github.com/pagopa/dx/pull/2256))

### ❤️ Thank You

- Andrea Grillo
- Christian Calabrese

## 2.1.0 (2026-09-22)

### 🚀 Features

- Federate managed identities and IAM roles with GitHub repositories that emit immutable OIDC subject claims (created or renamed after 2026-07-15). The DX CLI and the Azure and AWS Terraform modules now also trust the immutable subject embedding the numeric GitHub owner and repository IDs, keeping the name-based trust for older repositories.  ([#2219](https://github.com/pagopa/dx/pull/2219))

  See https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 2.0.3 (2026-09-16)

### 🩹 Fixes

- Update example Terraform state backends from the DEV environment to UAT. ([#2204](https://github.com/pagopa/dx/pull/2204))

### ❤️ Thank You

- Andrea Grillo
- Copilot App @Copilot

## 2.0.2 (2026-09-15)

### 🩹 Fixes

- Update examples to target UAT environment ([#2192](https://github.com/pagopa/dx/pull/2192))

### ❤️ Thank You

- Andrea Grillo

## 2.0.1 (2026-09-08)

### 🩹 Fixes

- Update internal dependencies ([#2120](https://github.com/pagopa/dx/pull/2120))

### ❤️ Thank You

- Andrea Grillo

# 2.0.0 (2026-09-01)

### ⚠️  Breaking Changes

- Drop support for Terraform versions older than 1.14.0. The minimum required Terraform version is now 1.15.0, and it is suggested to use 1.16.0 or later. ([#2086](https://github.com/pagopa/dx/pull/2086))

### ❤️ Thank You

- Andrea Grillo

## 1.0.1 (2026-08-26)

### 🩹 Fixes

- Read module tags from module manifests ([#2053](https://github.com/pagopa/dx/pull/2053))

### ❤️ Thank You

- Christian Calabrese

# 1.0.0 (2026-07-06)

### ⚠️  Breaking Changes

- Set Terraform minimum version to 1.14.0 ([#1940](https://github.com/pagopa/dx/pull/1940))

### ❤️ Thank You

- Andrea Grillo

## 0.0.7 (2026-06-23)

### 🩹 Fixes

- Upgrade actions/checkout reference in documentation ([#1882](https://github.com/pagopa/dx/pull/1882))

### ❤️ Thank You

- Andrea Grillo

## 0.0.6

### Patch Changes

- 01e27bb: Add examples and thorough explanation of input variables

## 0.0.5

### Patch Changes

- 891ad2b: Add IAM Permission to App CD role for ECR Push

## 0.0.4

### Patch Changes

- 329fd82: Added support to aws provider version 6

## 0.0.3

### Patch Changes

- 11ef401: Include oidc_provider_arn variable in examples and documentation

## 0.0.2

### Patch Changes

- f87fa4b: Moved OIDC provider from bootstrapper to core module

## 0.0.1

### Patch Changes

- b8c93fd: Add debugging tags for DX
- ea6d249: Add codebuild runner and change env names
