---
"@pagopa/dx-mcpserver": patch
---

Add `/search` REST endpoint for documentation search

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
