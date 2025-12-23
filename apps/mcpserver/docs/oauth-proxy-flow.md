# OAuth Proxy Flow

## Overview

The MCP server implements an **OAuth Proxy** pattern where it acts as an intermediary between the client and GitHub OAuth. This ensures that the GitHub OAuth client credentials (client ID and client secret) are never exposed to the client.

## Architecture

```
┌─────────┐         ┌──────────────┐         ┌────────────┐
│         │         │  MCP Server  │         │   GitHub   │
│ Client  │◄───────►│ (OAuth Proxy)│◄───────►│   OAuth    │
│         │         │              │         │            │
└─────────┘         └──────────────┘         └────────────┘
                           │
                           │ Stores:
                           │ - GITHUB_CLIENT_ID
                           │ - GITHUB_CLIENT_SECRET
```

## Flow Steps

### 1. Discovery

Client requests OAuth metadata from the server:

**Authorization Server Metadata:**

```
GET /.well-known/oauth-authorization-server
```

Server responds with endpoints pointing to itself (not GitHub):

```json
{
  "issuer": "https://api.dx.pagopa.it",
  "authorization_endpoint": "https://api.dx.pagopa.it/oauth/authorize",
  "token_endpoint": "https://api.dx.pagopa.it/oauth/token",
  "grant_types_supported": ["authorization_code"],
  "response_types_supported": ["code"],
  "scopes_supported": ["user"]
}
```

**Protected Resource Metadata (RFC 8707):**

```
GET /.well-known/oauth-protected-resource
```

Server responds with protected resource information:

```json
{
  "resource": "https://api.dx.pagopa.it",
  "authorization_servers": ["https://api.dx.pagopa.it"],
  "scopes_supported": ["user"],
  "bearer_methods_supported": ["header"],
  "resource_documentation": "https://api.dx.pagopa.it/docs"
}
```

### 2. Authorization Request

Client initiates OAuth flow by redirecting user to:

```
GET /oauth/authorize?
  redirect_uri={client_callback}&
  state={state}&
  scope=user
```

Server proxies this to GitHub with its own credentials:

```
Redirect to: https://github.com/login/oauth/authorize?
  client_id={SERVER_CLIENT_ID}&      ← Server's credential
  redirect_uri={client_callback}&
  state={state}&
  scope=user
```

### 3. Authorization Callback

User approves and GitHub redirects back to client with authorization code:

```
{client_callback}?code={auth_code}&state={state}
```

### 4. Token Exchange

Client exchanges the authorization code for an access token via the server proxy:

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={auth_code}&
redirect_uri={client_callback}
```

Server exchanges the code with GitHub using its credentials:

```
POST https://github.com/login/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={SERVER_CLIENT_ID}&         ← Server's credential
client_secret={SERVER_CLIENT_SECRET}& ← Server's secret
code={auth_code}&
redirect_uri={client_callback}
```

Server returns the access token to the client:

```json
{
  "access_token": "gho_xxxxxxxxxxxx",
  "token_type": "bearer",
  "scope": "user"
}
```

### 5. API Access

Client uses the access token to authenticate API requests:

```
POST /mcp
Authorization: Bearer gho_xxxxxxxxxxxx
```

Server validates the token and checks organization membership before processing the request.

## Security Benefits

1. **Credential Protection**: Client never sees the GitHub OAuth client ID or client secret
2. **Single Point of Control**: Server manages all OAuth credentials centrally
3. **Additional Validation**: Server can enforce organization membership before issuing tokens
4. **Audit Trail**: All OAuth flows are logged server-side
5. **PKCE Support**: Supports PKCE (Proof Key for Code Exchange) with S256 and plain methods for enhanced security
6. **Input Validation**: All OAuth parameters validated with Zod schemas to prevent injection attacks
7. **Log Sanitization**: Sensitive data (tokens, secrets) never appear in logs

## Configuration

The server requires these environment variables (loaded from AWS SSM Parameter Store):

- `GITHUB_CLIENT_ID_SSM_PARAM`: SSM parameter name containing the GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET_SSM_PARAM`: SSM parameter name containing the GitHub OAuth client secret
- `MCP_AUTH_TYPE`: Set to `"oauth"` to enable OAuth authentication
- `MCP_SERVER_URL`: The base URL of the MCP server (e.g., `https://api.dx.pagopa.it`)

### Security Best Practices

- OAuth tokens are stored in-memory (consider Redis for production with multiple instances)
- HTTPS is enforced for all OAuth endpoints
- State parameters are validated to prevent CSRF attacks
- Authorization codes are single-use and expire after exchange
- All inputs are sanitized before logging

## Implementation

See:

- [src/auth/oauth.ts](../src/auth/oauth.ts) - OAuth proxy logic with PKCE support and Zod validation
- [src/auth/tokenMiddleware.ts](../src/auth/tokenMiddleware.ts) - Token validation middleware
- [src/transport/http-sse.ts](../src/transport/http-sse.ts) - OAuth endpoints and HTTP SSE transport
- [src/utils/security.ts](../src/utils/security.ts) - Security utilities (HTTPS enforcement, log sanitization)
