## 3.1.0 (2026-10-29)

### 🚀 Features

- Allow AzureRM v5 alongside v4 and require Terraform >= 1.16.0. The Terraform floor is a major breaking change for the 18 modules marked major here. The VPN and Cosmos Account modules receive their major upgrade through CES-2366; their minor entries here cover dual-provider support and are superseded by that major bump. ([#2339](https://github.com/pagopa/dx/pull/2339))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

# 3.0.0 (2026-10-28)

### ⚠️  Breaking Changes

- Raise the AzureRM v4 minimum to 4.62 and Terraform to 1.16. ([#2327](https://github.com/pagopa/dx/pull/2327))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 2.0.6 (2026-10-15)

### 🩹 Fixes

- Restore the canonical DX ModuleName tag using the name in project.json, shared with Nx, instead of deriving it from the Terraform installation directory. ([#2364](https://github.com/pagopa/dx/pull/2364))

### ❤️ Thank You

- Andrea Grillo
- Mario Mupo @mamu0

## 2.0.5 (2026-10-13)

### 🩹 Fixes

- Update internal examples and AzureRM constraints ([#2342](https://github.com/pagopa/dx/pull/2342))

### ❤️ Thank You

- Andrea Grillo

## 2.0.4 (2026-10-01)

### 🩹 Fixes

- Incremented minimum version of pagopa/dx azure provider from 0.0 to 0.1 ([#2248](https://github.com/pagopa/dx/pull/2248))

### ❤️ Thank You

- Christian Calabrese

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

## 0.0.2

### Patch Changes

- 329fd82: Added support to aws provider version 6

## 0.0.1

### Patch Changes

- 707b5cf: First release
