---
sidebar_label: Profile Setup
sidebar_position: 3
---

# Git Profile Setup

Setting up your Git profile with the correct `user.name` and `user.email` is crucial for maintaining consistency in your project's commit history. This guide explains why it's important and how to configure your Git profile.

## Why Set Your Git Profile?

- **Uniformity**: ensures that all commits are associated with a consistent identity, which is especially important in collaborative environments
- **Professionalism**: using your work email address in commits reflects a professional approach and aligns with organizational standards

## How to Set Your Git Profile

To set your Git profile, use the following commands in your terminal:

```bash
git config --global user.name "Jane Doe"
git config --global user.email "jane.doe@pagopa.it"
```

Replace `"Jane Doe"` and `"jane.doe@pagopa.it"` with your actual name and work email address. This configuration will apply globally to all repositories on your machine. If you need to set it for a specific repository, omit the `--global` flag.

## Configuring via `.gitconfig` File

Alternatively, you can manually edit your `.gitconfig` file to set your profile. Open the file located in your home directory and add or update the following lines:

```ini
[user]
    name = Jane Doe
    email = jane.doe@pagopa.it
```

This method provides a direct way to configure your Git profile settings.

For more detailed information on Git configuration, you can refer to the [Git manual](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration).

## Signed Commits

### Why Use Signed Commits?

Signed commits provide an additional layer of security and trust in a repository. While **not mandatory**, they can be useful in various scenarios:

- **Authenticity**: ensures that commits are genuinely from the author and have not been tampered with
- **Trust**: helps reviewers and collaborators verify commit authorship without relying solely on email addresses

## Enabling Signed Commits

To use signed commits, you need to generate a GPG key (if you don't already have one) and configure Git to use it.

### Install GPG

If not yet installed, you can install GPG by running the following command:

```bash
brew install gpg
```

Once installed, add the following line to your `~/.gnupg/gpg.conf` file:

```ini
use-agent
```

Additionally, add these lines to your shell profile file (`~/.bashrc`, `~/.bash_profile`, or equivalent) and restart your shell:

```bash
export GPG_TTY=$(tty)
gpgconf --launch gpg-agent
```

### Generate a GPG Key (if you don’t have one)

Run the following command and follow the prompts:

```bash
gpg --full-gen-key
```

When prompted:
- Select the key type: `(4) RSA (sign only)` is sufficient for signing commits
- Choose a key size: `4096` bits is recommended
- Set an expiration date (e.g., `2y` for two years)
- Enter your name and email (`Jane Doe <jane.doe@pagopa.it>`)
- Set a secure passphrase

Alternatively, you can follow the [GitHub guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/generating-a-new-gpg-key) to generate a GPG key.

:::warning

Pay attention to steps `12` and `13` in the GitHub guide. They explain how to copy the public key that you are need to add to your GitHub profile.

:::

### Update Your GPG Key

To make sure your commits are signed with the correct key, you need to add the key to your GitHub profile.  
To address that, follow the [GitHub guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account).

### List Your GPG Keys

To find your key ID, run:

```bash
gpg --list-secret-keys --keyid-format SHORT
```

Look for a line similar to:

```
sec   rsa4096/ABCDEF1234567890 2025-02-26 [SC]
```

Copy the key ID (`ABCDEF1234567890`).

### Configure Git to Use Your GPG Key

Set up Git to use your key for signing commits:

```bash
git config --global user.signingkey ABCDEF1234567890
git config --global commit.gpgSign true
```

### Update `.gitconfig` Manually (Optional)

If you prefer, you can edit your `.gitconfig` file and add:

```ini
[user]
    signingkey = ABCDEF1234567890
[commit]
    gpgSign = true
```

For more details, refer to the [Git documentation on signing commits](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work).
