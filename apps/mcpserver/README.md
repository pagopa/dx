# @pagopa/dx-mcpserver

> An MCP server that support developers using DX tools.

This package contains the implementation of a Model Context Protocol (MCP) server.

## Development

This is a standard TypeScript project. To get started:

```bash
pnpm install
pnpm --filter @pagopa/dx-mcpserver build
```

You can run the following scripts:

- `pnpm --filter @pagopa/dx-mcpserver lint`: Lints the code.
- `pnpm --filter @pagopa/dx-mcpserver format`: Formats the code.
- `pnpm --filter @pagopa/dx-mcpserver test`: Runs tests.
- `pnpm --filter @pagopa/dx-mcpserver typecheck`: Checks types.

## Docker

To build the Docker container for this application, run the following command from the root of the monorepo:

```bash
docker build -t dx/mcp-server -f ./apps/mcpserver/Dockerfile .
```
