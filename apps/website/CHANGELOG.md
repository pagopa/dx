## 0.16.1 (2026-04-29)

### 🩹 Fixes

- Update Nx release docs for the PR warning flow ([#1651](https://github.com/pagopa/dx/pull/1651))

  The documentation now explains the warning shown on pull requests, what it
  means, and how to resolve it with a version plan.

### ❤️ Thank You

- Mario Mupo @mamu0

## 0.16.0 (2026-04-17)

### 🚀 Features

- Move fp-ts entry in Tech Radar to hold, and add deprecation rationale.
  ([#1590](https://github.com/pagopa/dx/pull/1590))

### 🩹 Fixes

- Improve documentation for upgraded Terraform pipelines.
  ([#1631](https://github.com/pagopa/dx/pull/1631))
- Upgrade dependencies ([#1639](https://github.com/pagopa/dx/pull/1639))

### 🧱 Updated Dependencies

- Updated @pagopa/eslint-config to 6.0.3
- Updated @pagopa/dx-mcpprompts to 0.2.7

### ❤️ Thank You

- Christian Calabrese @christian-calabrese
- Copilot @Copilot
- Danilo Spinelli @gunzip
- Marco Comi @kin0992

## 0.15.0 (2026-04-03)

### 🚀 Features

- Add website docs for DX Copilot plugins
  ([#1540](https://github.com/pagopa/dx/pull/1540))

### 🩹 Fixes

- Update docs with new nx-release action page
  ([#1486](https://github.com/pagopa/dx/pull/1486),
  [#1510](https://github.com/pagopa/dx/issues/1510))
- Improve documentation for monorepositories and dx-cli init command
  ([#1487](https://github.com/pagopa/dx/pull/1487))
- Align documentation for Nx Release instead of Changeset, add new page for
  Version Plans ([#1570](https://github.com/pagopa/dx/pull/1570))

### ❤️ Thank You

- Andrea Grillo
- Copilot @Copilot
- Danilo Spinelli @gunzip
- Luca Cavallaro
- Mario Mupo @mamu0

## 0.14.1

### Patch Changes

- f74034d: Upgrade docusaurus plugin

  The
  [newer version of the docusaurus plugin is backward compatible with the previous version](https://github.com/rachfop/docusaurus-plugin-llms/releases/tag/v0.3.0),
  so this change should not cause any issues.

- 0893d68: Fix broken link in blog post
  apps/website/blog/009-function-app-managed-identity.mdx
- f74034d: Reference React version from dedicated catalog
- Updated dependencies [f74034d]
  - @pagopa/dx-mcpprompts@0.2.6

## 0.14.0

### Minor Changes

- 75f940f: Bump website dependencies including React to v19
- 102e8a0: Create page to describe authentication with Managed Identity between
  APIM and Function App

## 0.13.0

### Minor Changes

- 4e4d4b7: Document agent plugins marketplace usage

## 0.12.9

### Patch Changes

- 442a508: Fix link and update module usage examples in iam-cross-subscription
  page

## 0.12.8

### Patch Changes

- d547c62: Update CLI docs with new SaveMoney features

## 0.12.7

### Patch Changes

- e0a3767: Upgrade dependencies
- Updated dependencies [e0a3767]
  - @pagopa/dx-mcpprompts@0.2.4

## 0.12.6

### Patch Changes

- 107a7ef: Fix documentation about terraform local modules location in the
  filesystem

## 0.12.5

### Patch Changes

- 96ea1c0: Document preference about creation of local modules and variables
  usage

## 0.12.4

### Patch Changes

- 7fb5e8b: Fix broken links and adding missing information to drift detection
  workflow
- 907253d: Update the page related to the permissions of the GitHub token used
  by the DX CLI

## 0.12.3

### Patch Changes

- ad9c693: Put the server name and server URL in a code block, using three
  backtick, to enable the copy to clipboard button

## 0.12.2

### Patch Changes

- d7f2fdf: Document DX best practices when writing terraform

## 0.12.1

### Patch Changes

- d83d537: Remove PAT authentication from the MCP server.

## 0.12.0

### Minor Changes

- e59245d: Improve DX CLI documentation, adding a page that describes the GitHub
  Personal Access Token

## 0.11.5

### Patch Changes

- dce58f4: Document MCP Server GH PAT setup in DX website
- b327972: Switch package manager from Yarn to pnpm in documentation.

## 0.11.4

### Patch Changes

- Updated dependencies [9fb9054]
  - @pagopa/dx-mcpprompts@0.2.0

## 0.11.3

### Patch Changes

- 84422c0: Update dependencies

## 0.11.2

### Patch Changes

- af0079a: Fix formatting of the tip blocks that did not render as expected

## 0.11.1

### Patch Changes

- 62b11e5: Add button to install the DX MCP server in VS Code

## 0.11.0

### Minor Changes

- 9e0333e: Add Blog page about new DX tool: SaveMoney

### Patch Changes

- fcaf084: Remove the "Edit this page" link from website's pages

## 0.10.3

### Patch Changes

- 6901bcd: Update Azure Custom Roles page

## 0.10.2

### Patch Changes

- 8739151: Update docs for Azure App Configuration section

## 0.10.1

### Patch Changes

- cfb975f: Update CLI doc with Static Web App check in SaveMoney tool

## 0.10.0

### Minor Changes

- 8d0d661: Documents the init command of the CLI

### Patch Changes

- ccc9ff1: Update savemoney doc
- Updated dependencies [e684e1a]
  - @pagopa/dx-mcpprompts@0.1.0

## 0.9.5

### Patch Changes

- e65b885: Fix the documentation about MCP server setup in VSCode with GitHub
  Copilot

## 0.9.4

### Patch Changes

- 9df8a84: Remove invalid value from allowed Azure Tags
- 70fd2a5: Replace azurerm keyvault's deprecated property
  "enable_rbac_authorization" with "rbac_authorization_enabled"
- Updated dependencies [9db820c]
  - @pagopa/dx-mcpprompts@0.0.3

## 0.9.3

### Patch Changes

- 2c90daa: Fix broken links in Azure docs
- 324e584: Avoid tracking each keystroke while searching the website
- 6f8f23b: Add `onBrokenAnchors` so the website build fails whit any invalid
  link

## 0.9.2

### Patch Changes

- e0a46c7: Add Getting Support page, and minor refinement for deprecated pages

## 0.9.1

### Patch Changes

- ca5c98f: Moved Azure DX Provider docs to Azure section
- 8de28e9: Move CDN docs to static assets (CDN and FrontDoor)
- 15917a5: Document storage account eventgrid trigger

## 0.9.0

### Minor Changes

- 0d8e640: Added examples before / after DX in blog post

## 0.8.5

### Patch Changes

- 1619aef: Update navbar items and enhance blog title styling
- 88596b6: Refactor docs for Azure Static Web Apps

## 0.8.4

### Patch Changes

- 421e8a4: Add @pagopa/eslint-config package documentation

## 0.8.3

### Patch Changes

- 1841454: Include input sku_size in Azure Static Web Apps HCL snippet
- 8ea5b13: Enabled llms.txt generation

## 0.8.2

### Patch Changes

- 707b5cf: Document AWS to Azure VPN module

## 0.8.1

### Patch Changes

- 7af2739: Prefix can now be long up to 4 characters instead of strictly 2
  characters

## 0.8.0

### Minor Changes

- a3f3535: Fix privacy policy

## 0.7.0

### Minor Changes

- 98097db: Change docs info-architecture and styles

## 0.6.0

### Minor Changes

- 2b751a4: Add analytics capabilities and GDPR information

## 0.5.1

### Patch Changes

- 13dd586: Add sbom documentation
- 3b5d55d: Update cdn deploy workflow url

## 0.5.0

### Minor Changes

- 2cc91e0: Update infrastructure folder structure documentation

  Updated the infrastructure folder structure conventions to reflect the current
  best practices:
  - **Replaced `identity` folder with `bootstrapper`**: Due to its broader
    configuration scope (GitHub runner, GitHub environments, GitHub environment
    secrets, and managed identities), the `bootstrapper` name better reflects
    the comprehensive setup it provides. The infrastructure setup now uses a
    `bootstrapper` folder containing environment-specific configurations
    (dev/prod)
  - **Added `core` folder documentation**: Documented the optional `core` folder
    for shared subscription resources like Azure Key Vaults and Log Analytics
    Workspace
  - **Updated folder descriptions**: Clarified the purpose and usage of each
    folder:
    - `repository`: Contains GitHub repository settings using the
      `github-environment-bootstrap` module
    - `bootstrapper`: Contains the `azure-github-environment-bootstrap` module
      for creating GitHub runners, managed identities, and environment
      configurations
    - `core`: Optional folder for shared subscription-level resources
    - `resources`: Application-specific resource definitions

### Patch Changes

- 7e87a58: Add doc page for Static Web App deploy pipeline

## 0.4.1

### Patch Changes

- 4142f1a: Document custom roles

## 0.4.0

### Minor Changes

- 25f7786: Migrate to Node 22

## 0.3.1

### Patch Changes

- ce98aa8: Bump dependencies to fix a peerDependency warning

## 0.3.0

### Minor Changes

- 0919f37: Add `@pagopa/eslint-config` as dependency

  Also, add `lint` and `format` scripts and run them. Remove the
  `babel.config.js` file, as it is not needed anymore.

## 0.2.6

### Patch Changes

- 7684ade: Remove Opex migration guide

## 0.2.5

### Patch Changes

- b83403f: Added blog post about terraform registry adoption
- 1667bf1: Upgrade dependencies

## 0.2.4

### Patch Changes

- 737c0a3: Add static analysis pipeline documentation

## 0.2.3

### Patch Changes

- 1741017: Upgrade docusaurus dependencies

## 0.2.2

### Patch Changes

- 160773a: Add instructions and examples to instrument Next.js app on Azure App
  Service

## 0.2.1

### Patch Changes

- dd1bf6d: Add cdn action documentation
- b065065: Add Legacy workloads documentation on website
- e0ed5af: Add Terraform Provider documentation page

## 0.2.0

### Minor Changes

- 2aa5329: Create code review guidelines
- c92f4c3: Create Git guidelines

### Patch Changes

- 133aa87: Add a note about Tracking System Reference to avoid the use of `#`

## 0.1.1

### Patch Changes

- 193f552: Update PR description guideline discouraging the use of images and
  links in PR description

## 0.1.0

### Minor Changes

- 6f727d4: Create Pull Request guidelines

### Patch Changes

- d68e21d: Edit terraform registry documentation after namespace change to
  pagopa-dx
- 5d51cf0: Make sidebar collapsible to make navigation easier
- 7a1868c: Improve AI documentation clarity and consistency

## 0.0.4

### Patch Changes

- e06c59a: Update article adding information about the instrumentation of ESM
  app

## 0.0.3

### Patch Changes

- 8fd8da4: Publishing terraform registry modules documentation refactored to
  enhance readability

## 0.0.2

### Patch Changes

- e193f54: Added troubleshooting sha256sum error and how to disable automatic
  pre-commits

## 0.0.1

### Patch Changes

- 7cc17f0: Document how to securely use terraform registry modules
- 68532dc: Document how to publish terraform modules to the registry
