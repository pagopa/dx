---
sidebar_label: "Standards and Conventions"
sidebar_position: 4
---

# Standards and Conventions

This section contains documentation of the tools, approaches, and activities
carried out to establish conventions across teams that want to adopt the DX
tooling.

## Why Follow Conventions?

Consistent conventions across teams enable:

- **Faster onboarding** - New team members can quickly understand any project
- **Better collaboration** - Teams can easily work together on shared code
- **Automated tooling** - DX tools can provide better support when conventions
  are followed
- **Reduced cognitive load** - Less time spent on decisions, more time building

## Essential Conventions

### 🔄 Git and Version Control

- **[Git Configuration](./git/git-config.md)** - Set up Git for optimal DX
  integration
- **[Branch Naming](./git/branch-name.md)** - Consistent branch naming patterns
- **[Commit Messages](./git/commit-message.md)** - Clear, structured commit
  history

[**Learn all Git conventions →**](./git/index.md)

### 📥 Pull Requests

- **[PR Format](./pull-requests/format.md)** - Templates and structure for clear
  PRs
- **[Acceptance Criteria](./pull-requests/acceptance-criteria.md)** - Define
  clear requirements
- **[Code Review](./pull-requests/code-review/index.md)** - Effective review
  practices
- **[Auto-merge](./pull-requests/auto-merge.md)** - Safe automated merging
- **[Changesets](./pull-requests/changeset.md)** - Semantic versioning and
  changelogs

[**Learn all PR conventions →**](./pull-requests/index.md)

### 📁 Project Structure

- **[Infrastructure Folder Structure](./infra-folder-structure.md)** - Organize
  Terraform and IaC code
- **[NPM Scripts](./npm-scripts.md)** - Standardized package.json scripts

## Quick Reference

### Git Workflow

1. Create feature branch: `feats/description` or `fixes/description`
2. Write [conventional commits](./git/commit-message.md)
3. Open PR with [proper format](./pull-requests/format.md)
4. Address code review feedback
5. Merge with [auto-merge](./pull-requests/auto-merge.md) when ready

### Azure Naming

```
<resource-type>-<workload>-<environment>-<region>-<instance>
Example: rg-myapp-prod-eus-01
```

### Folder Structure

```
/infra
  /environments
    /prod
    /staging
  /modules
  /shared
```

## Enforcement and Automation

### Automated Checks

Many conventions are enforced automatically through:

- **Pre-commit hooks** - Validate commit messages and code formatting
- **GitHub Actions** - Check naming conventions and PR formats
- **Branch protection** - Require reviews and status checks

### Tools Integration

DX tools work best when conventions are followed:

- **Terraform modules** expect standard folder structures
- **Deployment pipelines** use branch naming for environment detection
- **Monitoring tools** rely on consistent tagging

## Team Adoption

### Getting Started

1. **Review conventions** relevant to your project type
2. **Configure tools** like pre-commit hooks and branch protection
3. **Train team members** on new conventions
4. **Iterate and improve** based on team feedback

### Gradual Adoption

You can adopt conventions incrementally:

- Start with Git conventions for immediate benefits
- Add PR formatting and review practices
- Implement infrastructure conventions for new projects
- Migrate existing projects over time

## Getting Support

- **Questions about conventions?** Open an issue on the
  [DX repository](https://github.com/pagopa/dx/issues)
- **Suggest improvements** We welcome feedback on existing conventions
- **Request new conventions** for scenarios not yet covered

:::tip **Convention Benefits**

Teams that follow DX conventions report faster onboarding and fewer
infrastructure issues. The upfront investment in consistency pays dividends in
reduced maintenance and improved collaboration.

:::
