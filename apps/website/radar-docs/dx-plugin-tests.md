---
title: "DX Plugin: Tests"
ring: adopt
tags: [ai, copilot, dx, plugin, tests, integration, record-replay, vitest, testcontainers, tool]
---

DX Plugin for Tests extends Copilot with backend testing skills for Node.js and
TypeScript services, covering integration test harnesses, record-replay
strategies, Azure Functions testing, and Testcontainers-based dependency
management.

## Plugin resources

- [Plugin manifest](https://github.com/pagopa/dx/blob/main/plugins/tests/.plugin/plugin.json)

## Available skills

- [generate-backend-tests](https://github.com/pagopa/dx/blob/main/plugins/tests/skills/generate-backend-tests/SKILL.md)
  — Build or extend backend integration and record-replay test harnesses for
  Node.js/TypeScript services with real runtimes, Testcontainers dependencies,
  and optional `.env.test` hybrid cloud/local coverage
