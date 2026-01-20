/**
 * Session storage for stateless MCP server operations
 *
 * Uses AsyncLocalStorage to provide request-scoped context without global state.
 * This enables the server to run in stateless environments (e.g., AWS Lambda)
 * while still passing session data to tool handlers.
 *
 * Each HTTP request creates its own isolated session context that is automatically
 * cleaned up after the request completes.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type Session = {
  id: string;
  /** AWS Lambda request ID for correlating logs across CloudWatch and Application Insights */
  requestId?: string;
};

export const sessionStorage = new AsyncLocalStorage<Session>();
