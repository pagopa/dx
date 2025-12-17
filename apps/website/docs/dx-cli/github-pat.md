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

To use the DX CLI, you need a GitHub Personal Access Token (PAT) with the
following permissions. The token must be created with access to **all
repositories in the selected organization**.

### Organization Permissions

| Permission  | Access Level |
| ----------- | ------------ |
| **Members** | Read-only    |

### Repository Permissions

| Permission         | Access Level   |
| ------------------ | -------------- |
| **Pull requests**  | Read and write |
| **Secrets**        | Read and write |
| **Variables**      | Read and write |
| **Environments**   | Read and write |
| **Administration** | Read and write |
| **Metadata**       | Read-only      |

Grant access only to the repositories you need to manage with the DX CLI for
better security, but for full functionality, access to all repositories in the
organization is recommended.

For detailed steps on how to generate a token, see the
[GitHub documentation: Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

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

1. **Verify the token is set**: Check that the environment variable is correctly
   configured
2. **Check token expiration**: Ensure your token hasn't expired
3. **Verify permissions**: Make sure your token has the required permissions
4. **Test token validity**: You can test your token using the GitHub API:

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
- **Monitor token usage** - GitHub provides logs of token activity in Settings →
  Developer settings → Personal access tokens

## Revoking a Token

To revoke a token, follow the instructions in the
[GitHub documentation: Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation).

Remember to update your environment variable or remove it if you revoke a token.
