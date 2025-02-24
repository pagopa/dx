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
