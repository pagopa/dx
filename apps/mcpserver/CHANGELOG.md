## 0.2.2 (2026-04-28)

### 🧱 Updated Dependencies

- Updated @pagopa/azure-tracing to 0.5.0

## 0.2.1 (2026-04-17)

### 🩹 Fixes

- Upgrade dependencies ([#1639](https://github.com/pagopa/dx/pull/1639))

### 🧱 Updated Dependencies

- Updated @pagopa/azure-tracing to 0.4.18
- Updated @pagopa/eslint-config to 6.0.3
- Updated @pagopa/dx-mcpprompts to 0.2.7

### ❤️ Thank You

- Marco Comi @kin0992

## 0.2.0 (2026-04-09)

### 🚀 Features

- Implement a generation configuration prompt to reduce the scope of requests that a user can submit to the bedrock knowledge base ([#1586](https://github.com/pagopa/dx/pull/1586))

### ❤️ Thank You

- Christian Calabrese

## 0.1.6 (2026-04-01)

### 🧱 Updated Dependencies

- Updated @pagopa/azure-tracing to 0.4.17
- Updated @pagopa/eslint-config to 6.0.2

## 0.1.5

### Patch Changes

- 66b392d: Update to support the newest version of @pagopa/eslint-config (eslint10, new rules)
- Updated dependencies [66b392d]
  - @pagopa/dx-mcpprompts@0.2.5
  - @pagopa/azure-tracing@0.4.13

## 0.1.4

### Patch Changes

- e0a3767: Upgrade dependencies
- Updated dependencies [e0a3767]
  - @pagopa/azure-tracing@0.4.13
  - @pagopa/dx-mcpprompts@0.2.4

## 0.1.3

### Patch Changes

- 9ba9415: Make RAG queries return the full source files URL.

## 0.1.2

### Patch Changes

- 18b209c: Upgrade MCP SDK

## 0.1.1

### Patch Changes

- f419161: Add `/ask` REST endpoint for AI-powered documentation Q&A

  This change introduces a new `/ask` HTTP endpoint that enables direct natural language queries against the PagoPA DX documentation knowledge base with AI-generated responses.

  **Endpoint**: `POST /ask`

  **Request**:

  ```json
  {
    "query": "How do I setup Terraform modules?"
  }
  ```

  **Response**:

  ```json
  {
    "answer": "AI-generated answer based on documentation...",
    "sources": [
      "https://dx.pagopa.it/docs/terraform/modules/",
      "https://dx.pagopa.it/docs/getting-started/"
    ]
  }
  ```

  **Features**:
  - Uses Amazon Bedrock RetrieveAndGenerate API for contextual AI responses
  - Automatically converts S3 URIs to public documentation URLs
  - Returns unique source URLs (no duplicates)
  - Comprehensive error handling with detailed error messages
  - CORS-enabled for browser usage

  **Use Cases**:
  - Quick documentation lookups via API
  - Integration with chatbots or custom tools
  - Automated documentation assistance in CI/CD pipelines

- f419161: Add `/search` REST endpoint for documentation search

  This change introduces a new `/search` HTTP endpoint that provides semantic search capabilities across the PagoPA DX documentation knowledge base.

  **Endpoint**: `POST /search`

  **Request**:

  ```json
  {
    "query": "Azure naming conventions",
    "number_of_results": 5
  }
  ```

  **Response**:

  ```json
  {
    "query": "Azure naming conventions",
    "results": [
      {
        "content": "Documentation chunk content...",
        "score": 0.9542,
        "source": "https://dx.pagopa.it/docs/azure/naming/"
      }
    ]
  }
  ```

  **Features**:
  - Uses Amazon Bedrock Retrieve API with optional reranking
  - Configurable result count (1-20, default: 5)
  - Returns relevance scores for each result
  - Automatically converts S3 URIs to public documentation URLs
  - CORS-enabled for browser usage

  **Use Cases**:
  - Semantic documentation search
  - Finding relevant code examples and patterns
  - Building custom search interfaces
  - Research and documentation analysis

## 0.1.0

### Minor Changes

- deb54fd: Due to the slow implementation of features, the DX MCP server will start using the Official MCP SDK instead of the FastMCP library.
- d83d537: Remove PAT authentication from the MCP server.

## 0.0.12

### Patch Changes

- Updated dependencies [9fb9054]
  - @pagopa/dx-mcpprompts@0.2.0

## 0.0.11

### Patch Changes

- 9bb018b: Add server.json file according to MCP standards
- Updated dependencies [440fbe1]
  - @pagopa/dx-mcpprompts@0.1.3

## 0.0.10

### Patch Changes

- 62b11e5: Add button to install the DX MCP server in VS Code

## 0.0.9

### Patch Changes

- fe77b0d: Add `.gitignore` file

  `prettier` now will ignore files in the ignored paths.

- Updated dependencies [824fa3f]
  - @pagopa/azure-tracing@0.4.10

## 0.0.8

### Patch Changes

- 9d4109c: Upgrade dependencies
- Updated dependencies [9d4109c]
  - @pagopa/dx-mcpprompts@0.1.1

## 0.0.7

### Patch Changes

- Updated dependencies [e684e1a]
  - @pagopa/dx-mcpprompts@0.1.0

## 0.0.6

### Patch Changes

- e65b885: Fix the documentation about MCP server setup in VSCode with GitHub Copilot

## 0.0.5

### Patch Changes

- 9db820c: Make use of the new dynamic MCP prompts catalog
- Updated dependencies [9db820c]
  - @pagopa/dx-mcpprompts@0.0.3

## 0.0.4

### Patch Changes

- Updated dependencies [a36ee88]
  - @pagopa/dx-mcpprompts@0.0.2

## 0.0.3

### Patch Changes

- ee1ee24: Make use of the new dynamic MCP prompts catalog
- Updated dependencies [ee1ee24]
  - @pagopa/dx-mcpprompts@0.0.1

## 0.0.2

### Patch Changes

- 8ad73d8: Enhance documentation about the authentication process

## 0.0.1

### Patch Changes

- b5b6400: First release of the DX MCP Server. In this first version, the MCP server exposes the "QueryPagoPADXDocumentation" tool that queries an Amazon Bedrock Knowledge Base containing the DX documentation website.
