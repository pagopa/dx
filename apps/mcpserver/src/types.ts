/**
 * Authentication outcome for incoming MCP requests.
 */
export type AuthenticationStatus = Authenticated | Unauthorized;

type Authenticated = {
  authenticated: true;
  token: string; // if authenticated, token must be provided
};

type Unauthorized = {
  authenticated: false;
};
