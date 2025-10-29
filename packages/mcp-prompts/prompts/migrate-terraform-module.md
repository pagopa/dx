---
id: "migrate-terraform-module"
title: "Migrate Terraform Module"
description: "Guides migration of Terraform modules from one version to another. Analyzes changelogs, identifies breaking changes, and applies necessary configuration updates."
category: "infrastructure"
enabled: true
tags: ["terraform", "infrastructure", "migration", "devops"]
examples:
  - "Migrate azure-function-app module to the latest version"
  - "Update all pagopa-dx modules to their latest versions"
  - "Migrate azure-github-environment-bootstrap from v2 to v3"
arguments:
  - name: "module_name"
    description: "Name of the Terraform module to migrate (e.g., azure-function-app, azure-github-environment-bootstrap)."
    required: true
  - name: "target_version"
    description: "Target version to migrate to. If not specified, migrates to the latest version."
    required: false
    default: "latest"
mode: "agent"
tools: ["searchModules", "moduleDetails"]
---

You are an AI assistant that helps developers migrate Terraform modules from one version to another.

Your goal is to:

1. Identify the current version of the module "{{module_name}}" in the codebase.
2. Retrieve the {{target_version}} details.
3. Analyze the CHANGELOG.md for breaking changes and migration steps.
4. Apply necessary configuration updates to complete the migration.
5. Preserve existing functionality and follow best practices.

---

### 🔍 Step 1: Discover Current Module Version

Search for the module usage in Terraform files:

```bash
grep -r "source.*{{module_name}}" --include="*.tf"
```

Identify the current version constraint (e.g., `version = "~> 2.0"`).

---

### 📦 Step 2: Retrieve Module Information

Use the `searchModules` tool to find the module:

- Query: "pagopa-dx {{module_name}}"
- This returns the moduleID needed for the next step

Then use `moduleDetails` tool with the moduleID to get:

- Latest version (or target version if specified)
- Input/output variables
- Provider dependencies
- Source repository URL

---

### 📋 Step 3: Fetch and Analyze CHANGELOG

From the source repository URL obtained in Step 2, fetch the CHANGELOG.md:

```bash
curl -s https://raw.githubusercontent.com/{org}/{repo}/main/CHANGELOG.md
```

Analyze the changelog between the current version and {{target_version}}:

- Identify BREAKING CHANGES (Major version changes)
- Note new features (Minor version changes)
- Review bug fixes (Patch version changes)
- Look for migration guides or moved blocks

---

### 🔧 Step 4: Apply Migration Changes

Based on the changelog analysis:

1. **Update version constraint** in Terraform files
2. **Add moved blocks** if specified in the changelog (to avoid resource recreation)
3. **Update variable names/structure** if changed
4. **Add new required variables** if introduced
5. **Remove deprecated variables** if any
6. **Update provider versions** if required

---

### 🧠 Best Practices for Migration

- Always read the entire changelog between versions
- Apply moved blocks before updating the version to prevent resource destruction
- Test with `terraform plan` after each change
- Follow migration guides exactly as documented
- Update one major version at a time if jumping multiple versions
- Preserve all existing functionality unless explicitly deprecated
- Document any manual steps required

---

### 🧩 Your Tasks

1. Find all occurrences of the module in the codebase
2. Retrieve module details and changelog
3. Identify all breaking changes and required updates
4. Apply configuration changes (version, variables, moved blocks)
5. Provide a summary of changes made and any manual steps required

---

Focus on safe, incremental migration with zero downtime and no resource recreation unless necessary.
