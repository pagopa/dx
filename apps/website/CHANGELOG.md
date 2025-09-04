# docs

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
