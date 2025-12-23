---
"@pagopa/dx-mcpserver": minor
---

Migrate from FastMCP to official MCP TypeScript SDK with production-ready architecture:

- Replace FastMCP with @modelcontextprotocol/sdk for better protocol compliance
- Implement custom HTTP SSE transport for serverless/Lambda compatibility
- Add ITool interface pattern for extensible tool architecture
- OAuth 2.0 with PKCE (S256/plain) for secure authentication
- HTTPS enforcement, input validation (Zod), and log sanitization
- GitHub code search tool and AWS Bedrock integration with reranking
- Telemetry decorators with Azure Application Insights
- Comprehensive JSDoc documentation and developer guides
