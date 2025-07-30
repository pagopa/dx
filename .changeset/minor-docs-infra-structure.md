---
"docs": minor
---

Update infrastructure folder structure documentation

Updated the infrastructure folder structure conventions to reflect the current best practices:

- **Replaced `identity` folder with `bootstrapper`**: Due to its broader configuration scope (GitHub runner, GitHub environments, GitHub environment secrets, and managed identities), the `bootstrapper` name better reflects the comprehensive setup it provides. The infrastructure setup now uses a `bootstrapper` folder containing environment-specific configurations (dev/prod)
- **Added `core` folder documentation**: Documented the optional `core` folder for shared subscription resources like Azure Key Vaults and Log Analytics Workspace
- **Updated folder descriptions**: Clarified the purpose and usage of each folder:
  - `repository`: Contains GitHub repository settings using the `github-environment-bootstrap` module
  - `bootstrapper`: Contains the `azure-github-environment-bootstrap` module for creating GitHub runners, managed identities, and environment configurations
  - `core`: Optional folder for shared subscription-level resources
  - `resources`: Application-specific resource definitions

- **Enhanced folder structure example**: Updated the example directory tree to show the current recommended structure with `bootstrapper/dev` and `bootstrapper/prod` configurations

These changes align the documentation with the actual implementation patterns used in DX projects and provide clearer guidance for repository setup.
