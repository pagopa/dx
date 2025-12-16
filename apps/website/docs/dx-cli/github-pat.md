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

### Step 1: Navigate to Token Settings

1. Log in to your GitHub account
2. Click on your profile picture in the top-right corner
3. Select **Settings** from the dropdown menu
4. In the left sidebar, scroll down and click on **Developer settings** (at the
   bottom)
5. Click on **Personal access tokens**
6. Choose **Fine-grained tokens**

### Step 2: Create a New Token

Fine-grained tokens provide granular control over permissions and can be scoped
to specific repositories.

1. Click **Generate new token** → **Generate new token (fine-grained)**
2. Fill in the token details:
   - **Token name**: Give it a descriptive name (e.g., `DX-CLI-Token`)
   - **Expiration**: Select an appropriate expiration period (90 days
     recommended)
   - **Description**: Optional, but helpful for tracking usage
   - **Resource owner**: Select your organization or personal account
   - **Repository access**: Choose one of the following:
     - **All repositories** - Token works across all your repositories
     - **Only select repositories** - Choose specific repositories (more secure)

### Step 3: Configure Permissions

The DX CLI needs specific permissions to create pull requests.

Select the following **Repository permissions**:

| Permission        | Access Level   | Required For                                           |
| ----------------- | -------------- | ------------------------------------------------------ |
| **Pull requests** | Read and write | Creating and managing pull requests                    |
| **Metadata**      | Read-only      | Accessing repository metadata (automatically included) |

:::tip[Principle of Least Privilege] For better security, grant access only to
the repositories you need to manage with the DX CLI. :::

### Step 4: Generate and Copy the Token

1. Review your selections
2. Click **Generate token** at the bottom of the page
3. **Important**: Copy the token immediately - you won't be able to see it
   again!
4. Store it securely (consider using a password manager)

:::warning[Token Security]

- Never commit your token to version control
- Never share your token in public channels
- Regenerate your token immediately if it's accidentally exposed
- Use separate tokens for different purposes :::

## Setting the Token as Environment Variable

The DX CLI expects the GitHub token to be available as an environment variable.

### Linux and macOS

Add the token to your shell configuration file:

#### For Bash (~/.bashrc or ~/.bash_profile)

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

#### For Zsh (~/.zshrc)

```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

#### For Fish (~/.config/fish/config.fish)

```fish
set -gx GITHUB_TOKEN "ghp_your_token_here"
```

After adding the line, reload your shell configuration:

```bash
# For Bash
source ~/.bashrc

# For Zsh
source ~/.zshrc

# For Fish
source ~/.config/fish/config.fish
```

### Windows

#### Using Command Prompt (CMD)

For the current session only:

```cmd
set GITHUB_TOKEN=ghp_your_token_here
```

To set permanently (requires administrator privileges):

```cmd
setx GITHUB_TOKEN "ghp_your_token_here"
```

#### Using PowerShell

For the current session only:

```powershell
$env:GITHUB_TOKEN = "ghp_your_token_here"
```

To set permanently for the current user:

```powershell
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_your_token_here", "User")
```

### Verify the Token is Set

You can verify that the environment variable is correctly set:

```bash
# Linux/macOS/PowerShell
echo $GITHUB_TOKEN

# Windows CMD
echo %GITHUB_TOKEN%
```

:::tip[Alternative: .env Files] For project-specific tokens, you can create a
`.env` file in your project root:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

Make sure to add `.env` to your `.gitignore` file to prevent accidentally
committing it. :::

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

If you need to revoke a token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Find the token in the list
3. Click **Delete** or **Revoke**
4. Confirm the deletion

Remember to update your environment variable or remove it if you revoke a token.

## Additional Resources

- [GitHub Documentation: Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Documentation: Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)
