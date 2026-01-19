/**
 * Centralized error handling utilities for the MCP server.
 * Provides consistent error messages across all tools.
 */

import { AxiosError } from "axios";
import { ZodError } from "zod";

/**
 * Handles API errors and returns user-friendly error messages.
 * Supports Axios errors, Zod validation errors, and generic errors.
 *
 * @param error - The error to handle
 * @returns A formatted error message string
 */
export function handleApiError(error: unknown): string {
  // Handle Axios HTTP errors
  if (error instanceof AxiosError) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          return "Error: Bad request. Please check your input parameters.";
        case 401:
          return "Error: Authentication failed. Please check your credentials.";
        case 403:
          return "Error: Permission denied. You don't have access to this resource.";
        case 404:
          return "Error: Resource not found. Please check the ID is correct.";
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        case 500:
          return "Error: Server error. The service is temporarily unavailable.";
        case 502:
          return "Error: Bad gateway. The service is temporarily unavailable.";
        case 503:
          return "Error: Service unavailable. Please try again later.";
        default:
          return `Error: API request failed with status ${error.response.status}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    } else if (error.code === "ENOTFOUND") {
      return "Error: Could not connect to the server. Please check your network.";
    } else if (error.code === "ECONNREFUSED") {
      return "Error: Connection refused. The server may be down.";
    }
    return `Error: Network error occurred: ${error.message}`;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const issues = error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return `Error: Invalid input - ${issues}`;
  }

  // Handle generic errors
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Error: Unexpected error occurred: ${String(error)}`;
}

/**
 * Type guard to check if an error is an Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof AxiosError;
}

/**
 * Type guard to check if an error is a Zod validation error
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
