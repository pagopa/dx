---
id: github-pat
title: GitHub Personal Access Token Setup
sidebar_position: 2
description:
  How to generate and configure a GitHub Personal Access Token for DX CLI
  operations.
---

The DX CLI requires a GitHub Personal Access Token (PAT) to interact with GitHub
repositories, particularly when creating pull requests and managing repository
content.

## Prerequisites

- A GitHub account with access to the repositories you want to manage
- Appropriate permissions in the target repositories (typically write access or
  higher)

## Generating a Personal Access Token

To use the DX CLI, you need a GitHub Personal Access Token (PAT). Follow the
official GitHub documentation to create a fine-grained personal access token:
[Creating a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).
The token must be created with access to **all repositories in the selected
organization** and include the following permissions.

### Organization Permissions

| Permission  | Access Level | Reason                                                                        |
| ----------- | ------------ | ----------------------------------------------------------------------------- |
| **Members** | Read-only    | Required to read organization members for repository creation and assignment. |

### Repository Permissions

| Permission         | Access Level   | Reason                                                                       |
| ------------------ | -------------- | ---------------------------------------------------------------------------- |
| **Administration** | Read and write | Required for repository settings and management tasks.                       |
| **Contents**       | Read and write | Required to read and update files in repositories (e.g., for automated PRs). |
| **Environments**   | Read and write | Needed to manage repository environments for CI/CD workflows.                |
| **Metadata**       | Read-only      | Automatically included; allows access to repository metadata.                |
| **Pull requests**  | Read and write | Required to create and manage pull requests.                                 |
| **Secrets**        | Read and write | Needed to manage repository secrets for automation and CI/CD.                |
| **Variables**      | Read and write | Needed to manage repository variables for workflows and automation.          |

:::note

The `init` command must have permission to access all repositories in the
organization because it creates a new repository.

:::

For detailed steps on how to generate a token, see the
[official GitHub documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

## Using the Token

To use the DX CLI with your GitHub Personal Access Token, set the token in your
environment and run the CLI command. For example:

```bash
export GITHUB_TOKEN=<your_token>
npx @pagopa/dx-cli init
```

Replace `<your_token>` with your actual GitHub Personal Access Token. The CLI
will use the token from the `GITHUB_TOKEN` environment variable for
authentication.

## Troubleshooting Authentication

If you encounter authentication errors:

1. **Verify the token is set**: check that the environment variable is correctly
   configured
2. **Check token expiration**: ensure your token hasn't expired
3. **Verify permissions**: make sure your token has the required permissions
4. **Test token validity**: test your token using the GitHub API:

```bash
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

This should return your GitHub user information if the token is valid.

## Token Best Practices

- **Use fine-grained tokens** when possible for better security
- **Set appropriate expiration dates** - shorter is generally better (30-90
  days)
- **Rotate tokens regularly** - even before expiration
- **Use different tokens** for different tools and purposes
- **Revoke unused tokens** - clean up tokens you no longer need

## Revoking a Token

To revoke a token, follow the instructions in the
[GitHub documentation: Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation).

Remember to update your environment variable or remove it if you revoke a token.
