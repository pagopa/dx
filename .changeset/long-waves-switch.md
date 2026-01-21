---
"@pagopa/dx-mcpserver": patch
---

Add `/ask` REST endpoint for AI-powered documentation Q&A

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
