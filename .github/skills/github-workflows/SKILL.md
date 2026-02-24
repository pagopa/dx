---
name: github-workflows
description: Guidelines for writing reusable GitHub Actions workflows. Focuses on configuration via inputs, version pinning for external actions, parameter minimization, and logic isolation in external scripts. Use when creating or refactoring GitHub workflows in the DX repository.
---

# GitHub Reusable Workflows Skill

This skill provides guidelines and best practices for creating high-quality, maintainable, and secure reusable GitHub Actions workflows within the PagoPA DX repository.

## When to Use This Skill

Use this skill when you are:

- Designing a new reusable workflow (`workflow_call`).
- Refactoring existing workflows to improve maintainability.
- Integrating third-party actions into the CI/CD pipeline.
- Moving complex logic out of YAML files into dedicated scripts or actions.

## Guidelines

### 1. Configuration: Inputs/Arguments vs. Environment Variables

Always prefer explicit inputs over implicit environment variables for workflow configuration.

- **Explicit is better than Implicit**: Using `on.workflow_call.inputs` defines a clear contract for the workflow. Callers know exactly what information is required.
- **Predictability**: Environment variables can be accidentally inherited or shadowed, leading to unpredictable behavior. Inputs are scoped and verified by GitHub Actions.
- **Single-run Focus**: Design workflows to be "single-run" where all necessary state is passed in via arguments/inputs, avoiding reliance on pre-existing environment state.

### 2. Version Pinning

Maintain a clear distinction between internal and external dependencies to balance agility and security.

- **Internal DX Actions**: It is acceptable not to pin internal PagoPA DX actions to strict versions during development or when they are part of the same lifecycle as the caller. Using branch names like `main` or semantic tags is generally okay.
- **External Actions**: **MUST** always be pinned to a specific version, ideally a full commit SHA. This protects the pipeline from supply chain attacks and prevents unexpected failures caused by upstream breaking changes.

### 3. Parameter Management

Keep the user interface of your reusable workflows clean and simple in order to reduce cognitive load and improve usability.

- **Minimized Count**: Only expose parameters that are strictly necessary.
- **Sensible Defaults**: Provide defaults for optional inputs to simplify the experience for the common use cases.
- **Avoid Useless Inputs**: Never include inputs that are rarely used or whose values can be inferred from other context. A smaller set of inputs reduces cognitive load for the workflow users.

### 4. Logic Isolation

Avoid "YAML hell" by keeping workflow files focused on orchestration rather than implementation.

- **External Scripts**: If a shell script exceeds a few lines or involves complex logic (branching, loops, error handling), isolate it into an external Bash or TypeScript script.
- **Reusable Versioned Actions**: For complex logic that requires dependencies or is reused across multiple workflows, create a dedicated reusable action with its own `package.json`. This allows for independent testing and versioning.
- **Maintainability**: Smaller YAML files are easier to audit and understand. Complex logic belongs in languages with better tooling for testing and linting (like TypeScript).
