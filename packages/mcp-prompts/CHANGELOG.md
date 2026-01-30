# @pagopa/dx-mcpprompts

## 0.2.2

### Patch Changes

- 14a5573: Add private flag in order to avoid publish the package on NPM registry

## 0.2.1

### Patch Changes

- 4f526a2: Update the diagram generation prompt to output Mermaid diagrams as standalone .mmd files instead of embedding the Mermaid code directly in README files.

## 0.2.0

### Minor Changes

- 9fb9054: Add new prompt that helps developers during the review and fix of the comments received throughout a PR.

## 0.1.3

### Patch Changes

- 440fbe1: Remove useless `getPrompts` call in mcp-prompts package. The `getPrompts` function was called in the `index.ts` causing all applications importing it to run twice.

## 0.1.2

### Patch Changes

- fb9caa2: Update dependencies

## 0.1.1

### Patch Changes

- 9d4109c: Upgrade dependencies

## 0.1.0

### Minor Changes

- e684e1a: Add prompt for terraform module diagram generation

## 0.0.3

### Patch Changes

- 9db820c: First implementation of the MCP prompts catalog and dynamic loader

## 0.0.2

### Patch Changes

- a36ee88: Refine the resolve security findings and migrate terraform module prompts to respect users' requested scope

## 0.0.1

### Patch Changes

- ee1ee24: First implementation of the MCP prompts catalog and dynamic loader
