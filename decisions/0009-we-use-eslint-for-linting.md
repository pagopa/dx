# 9. We use ESLint for linting

Date: 2025-01-20

## Status

Accepted

## Context

In our development workflow, maintaining code quality, consistency, and
adherence to best practices is crucial. Given the complexity of our
TypeScript-based stack and the collaborative nature of our team, it's essential
to have an automated tool to enforce coding standards and catch potential issues
early in the development process.

## Decision

We have decided to adopt [ESLint](https://eslint.org/) as our primary linting
tool for the following reasons:

- **Industry Standard:** ESLint is widely used in the JavaScript/TypeScript
  ecosystem and provides comprehensive rule sets.
- **Customization:** It allows us to configure rules according to our project’s
  needs and enforce coding standards that align with our goals.
- **Integration:** ESLint integrates seamlessly with our existing development
  tools, including IDEs, CI/CD pipelines, and version control systems.
- **Extensibility:** Support for plugins and extensions that cover
  TypeScript-specific checks and framework-specific guidelines (e.g., React,
  Node.js).
- **Developer Experience:** ESLint provides helpful suggestions and automated
  fixes, improving productivity and code maintainability.

## Consequences

- **Consistency:** Ensuring a uniform coding style across the entire codebase.
- **Early Issue Detection:** Catching potential bugs and anti-patterns before
  code is merged.
- **Learning Curve:** Team members may need some time to adapt to the configured
  rules.
- **Maintenance:** Regular updates to rules and configurations will be required
  to keep up with evolving best practices.
- **Automated Workflows:** ESLint will be integrated into pre-commit hooks and
  CI pipelines to enforce linting before merging code.

By adopting ESLint, we aim to enhance code quality, reduce technical debt, and
streamline our development process.
