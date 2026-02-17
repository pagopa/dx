import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Parses JSON body from an incoming HTTP request.
 */
export async function parseJsonBody<T>(
  req: IncomingMessage,
): Promise<T | undefined> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return undefined;
  return JSON.parse(body) as T;
}

/**
 * Sends an error response in a standard format.
 */
export function sendErrorResponse(
  res: ServerResponse,
  statusCode: number,
  message: string,
  details?: unknown,
): void {
  sendJsonResponse(res, statusCode, {
    error: message,
    ...(details ? { details } : {}),
  });
}

/**
 * Sends a JSON response with the specified status code.
 */
export function sendJsonResponse(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * Sets standard CORS headers for the response.
 */
export function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
