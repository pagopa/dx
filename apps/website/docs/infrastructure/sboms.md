---
sidebar_position: 5
---

# SBOM Management

## What is an SBOM

An SBOM (Software Bill of Materials) is a formal, machine-readable inventory of
software components and dependencies contained in an application. It provides a
detailed list of all the libraries, frameworks, and modules that make up the
software, along with their versions and licenses.

## SBOM Management Script

To streamline the process of handling SBOMs, this project includes a
[script](https://github.com/pagopa/dx/blob/main/sbom.sh) that automates their
creation, updates, and validation.

### Requirements

Before using the script, you need to have the following tools installed on your
system:

- **[Syft](https://github.com/anchore/syft)**: A CLI tool for generating SBOMs
  from container images and filesystems.
- **[Grype](https://github.com/anchore/grype)**: A vulnerability scanner for
  container images and filesystems.

You can find installation instructions on their official GitHub pages.

### How the Script Works

When you run the generation command, the script performs the following actions:

1. **Creates a Directory**: It ensures a directory named `sboms` exists at the
   root of the project. If it doesn't, it will be created.
2. **Scans and Generates**: The script then scans different parts of the
   repository to generate multiple SBOM files, organizing them by technology:
   - A single `sbom-npm-workspace.json` is created for all TypeScript and
     Node.js dependencies.
   - An individual SBOM file is generated for each Go provider located in the
     `providers/` directory.
   - An individual SBOM file is generated for each Terraform module located in
     the `infra/modules/` directory.
3. **Stores the SBOMs**: All generated JSON files are stored inside the `sboms`
   directory for easy access and validation.

By default, the script will regenerate all SBOM files also if it already exists.
You can override this behavior using the `--update` flag that generate only new sboms.

### Usage

#### Using the Shell Script

You can execute the script directly from your terminal:

- **To generate all SBOMs**, overwriting existing ones (this is the default action):

  ```sh
  sh ./sbom.sh --generate

  # or
  # sh ./sbom.sh
  ```

- **To generate only missing SBOMs** :

  ```sh
  sh ./sbom.sh --update
  ```

- **To validate existing SBOMs** for vulnerabilities:

  ```sh
  sh ./sbom.sh --validate
  ```



#### Using Turborepo

You can also run the script using the predefined Turborepo tasks defined in the
`package.json` file:

- **To generate all SBOMs**:

  ```sh
  turbo sbom-generate
  ```

- **To validate existing SBOMs**:

  ```sh
  turbo sbom-validate
  ```
  