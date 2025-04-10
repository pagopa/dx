---
sidebar_label: Auto Merge
sidebar_position: 2
---

# Auto Merge

[Auto-merge is a powerful feature in GitHub](https://github.blog/changelog/2021-02-04-pull-request-auto-merge-is-now-generally-available/)
that automatically merges pull requests once they meet the required conditions,
such as passing all status checks (e.g., CI pipeline, dependency on another PR)
or receiving approvals from designated reviewers.

This feature simplifies the development process, reduces manual work, and
ensures code is merged automatically when ready, saving time and avoiding
delays.

## Benefits of Auto Merge

- **Time Saving**: eliminates the need for manual intervention once the PR meets
  its conditions.
- **Consistency**: ensures that only code passing all tests and reviews gets
  merged, maintaining high quality.
- **Faster Time to Production**: automates the merge process, enabling faster
  deployment of code

## How to Enable Auto Merge

You can enable auto-merge for a repository by following the
[official GitHub documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request#enabling-auto-merge).

If the repository settings are managed through
[Terraform, using the `azure_github_environment_bootstrap` module](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest),
auto-merge is enabled by default.  
This means that while the feature is available for the repository, it does not
automatically merge all PRs.
