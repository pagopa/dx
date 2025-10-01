---
sidebar_position: 3
---

# Configuring ESLint

The `@pagopa/eslint-config` package provides a shared ESLint configuration for
JavaScript and TypeScript projects.

:::note

Most rules are **autofixable** - run `eslint --fix src` to automatically fix
formatting and style issues.

:::

## Requirements

This ESLint configuration requires **ESLint > 9** with **flat config files**
(`eslint.config.js` or `eslint.config.mjs`). We do not support older versions of
ESLint or classic configuration files (`.eslintrc.*`).

## Features

- **Import Organization**: Uses the perfectionist plugin for natural
  import/export sorting, grouping, and object key reordering
- **TypeScript Support**: Uses `typescript-eslint` strict and stylistic
  configurations
- **Prettier Integration**: Combines ESLint with Prettier for consistent
  formatting
- **Testing Rules**: Specialized configuration for Vitest test files
- **Code Quality**: Enforces complexity limits and modern JavaScript practices

## Installation

```bash
pnpm add -D eslint @pagopa/eslint-config
```

## Configuration

Create an `eslint.config.js` file at the root of your project:

```js
// eslint.config.js
import pagopa from "@pagopa/eslint-config";

export default pagopa;
```

For CommonJS projects, use `eslint.config.mjs` instead.

## Rules

The configuration includes rules for:

- Unused variables and expressions
- Function complexity (maximum 200 lines)
- Equality operators (`==` vs `===`)
- ... many other code quality checks!

For the complete list of rules, see the
[configuration implementation](https://github.com/pagopa/dx/tree/main/packages/eslint-config).

## Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint --fix src",
    "lint:check": "eslint src"
  }
}
```
