/**
 * @fileoverview Read-only Azure MCP adapter for Terraform permission checks.
 *
 * The adapter only starts an Azure MCP command that explicitly includes the
 * read-only flag, discovers RBAC-related read-only tools, and passes any safe
 * result back as model context. If the server is absent or exposes no usable
 * RBAC tool, the action falls back to the skill's Terraform-derived path.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface AzureMcpContextOptions {
  argsText: string;
  cdIdentityName?: string;
  command: string;
  enabled: boolean;
  environment: NodeJS.ProcessEnv;
  planText: string;
  subscriptionId?: string;
  timeoutMs: number;
  workingDirectory: string;
}

type ListedTool = Awaited<ReturnType<Client["listTools"]>>["tools"][number];

export async function collectAzureMcpContext(
  options: AzureMcpContextOptions,
): Promise<string> {
  if (!options.enabled) {
    return "Status: skipped. Azure MCP collection was disabled by action input.";
  }

  const args = splitCommandLine(options.argsText);
  assertReadOnlyCommand(options.command, args);

  const client = new Client({
    name: "pagopa-dx-terraform-permission-check",
    version: "0.0.1",
  });
  const transport = new StdioClientTransport({
    args,
    command: options.command,
    cwd: options.workingDirectory,
    env: inheritAzureEnvironment(options.environment),
    stderr: "pipe",
  });

  try {
    await withTimeout(
      client.connect(transport),
      options.timeoutMs,
      "Azure MCP startup timed out",
    );

    const toolsResult = await withTimeout(
      client.listTools(),
      options.timeoutMs,
      "Azure MCP tool discovery timed out",
    );
    const candidates = toolsResult.tools.filter(isSafeRbacTool);

    if (candidates.length === 0) {
      return [
        "Status: unavailable. Azure MCP started, but no read-only RBAC/authorization tool was advertised.",
        `Advertised tools: ${toolsResult.tools.map((tool) => tool.name).join(", ") || "none"}`,
      ].join("\n");
    }

    const scopes = extractAzureScopes(options.planText);
    const callableTool = candidates
      .map((tool) => ({
        arguments: buildToolArguments(tool, options, scopes),
        tool,
      }))
      .find((candidate) => candidate.arguments);

    if (!callableTool || !callableTool.arguments) {
      return [
        "Status: unavailable. Azure MCP exposed read-only RBAC tools, but the action could not satisfy their required input schema safely.",
        `Candidate tools: ${candidates.map((tool) => tool.name).join(", ")}`,
      ].join("\n");
    }

    const toolResult = await withTimeout(
      client.callTool({
        arguments: callableTool.arguments,
        name: callableTool.tool.name,
      }),
      options.timeoutMs,
      `Azure MCP tool ${callableTool.tool.name} timed out`,
    );

    return [
      "Status: collected. Live Azure MCP read-only context follows.",
      `Tool: ${callableTool.tool.name}`,
      `Arguments: ${JSON.stringify(callableTool.arguments)}`,
      "Result:",
      formatToolResult(toolResult),
    ].join("\n");
  } catch (error) {
    return `Status: unavailable. Azure MCP live context could not be collected: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    await transport.close().catch(() => undefined);
  }
}

export function splitCommandLine(value: string): string[] {
  const matches = value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return matches.map((match) => match.replace(/^(["'])(.*)\1$/, "$2"));
}

function assertReadOnlyCommand(command: string, args: string[]): void {
  const tokens = [command, ...args].map((token) => token.toLowerCase());
  if (!tokens.includes("--read-only")) {
    throw new Error(
      "Azure MCP command must include --read-only. Enable read-only mode and rerun the permission check.",
    );
  }
}

function buildToolArguments(
  tool: ListedTool,
  options: AzureMcpContextOptions,
  scopes: string[],
): Record<string, unknown> | undefined {
  const properties = tool.inputSchema.properties ?? {};
  const required = new Set(tool.inputSchema.required ?? []);
  const values = Object.fromEntries(
    Object.keys(properties)
      .map((key) => [key, valueForProperty(key, options, scopes)] as const)
      .filter(
        (entry): entry is readonly [string, NonNullable<unknown>] =>
          entry[1] !== undefined,
      ),
  );

  const missingRequired = [...required].filter((key) => !(key in values));
  if (missingRequired.length > 0) {
    return undefined;
  }

  return values;
}

function extractAzureScopes(planText: string): string[] {
  const scopeRegex =
    /\/subscriptions\/[0-9a-f-]+(?:\/resourceGroups\/[^\s"']+)?(?:\/providers\/[^\s"']+)?/giu;
  return [...new Set(planText.match(scopeRegex) ?? [])];
}

function formatToolResult(
  result: Awaited<ReturnType<Client["callTool"]>>,
): string {
  if ("toolResult" in result) {
    return JSON.stringify(result.toolResult, null, 2);
  }

  const structuredContent = result.structuredContent
    ? `\nStructured content:\n${JSON.stringify(result.structuredContent, null, 2)}`
    : "";
  const content = result.content
    .map((item) => {
      if (item.type === "text") {
        return item.text;
      }
      return JSON.stringify(item);
    })
    .join("\n");

  return `${content}${structuredContent}`.trim();
}

function inheritAzureEnvironment(
  environment: NodeJS.ProcessEnv,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" &&
        (entry[0].startsWith("ARM_") ||
          entry[0].startsWith("AZURE_") ||
          entry[0] === "PATH" ||
          entry[0] === "HOME"),
    ),
  );
}

function isSafeRbacTool(tool: ListedTool): boolean {
  const searchable = [tool.name, tool.description, tool.title]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
  const isRbacTool = /(rbac|role|authorization|permission)/u.test(searchable);
  const isReadOnly = tool.annotations?.readOnlyHint === true;
  const isDestructive = tool.annotations?.destructiveHint === true;
  return isRbacTool && isReadOnly && !isDestructive;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}\n[truncated]`;
}

function valueForProperty(
  key: string,
  options: AzureMcpContextOptions,
  scopes: string[],
): unknown {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  const subscriptionId =
    options.subscriptionId ?? options.environment["ARM_SUBSCRIPTION_ID"];

  if (normalized.includes("subscription")) {
    return subscriptionId;
  }

  if (
    normalized.includes("principal") ||
    normalized.includes("assignee") ||
    normalized.includes("identity") ||
    normalized.includes("objectid") ||
    normalized.includes("clientid")
  ) {
    return options.cdIdentityName;
  }

  if (normalized === "scopes" || normalized.endsWith("scopes")) {
    return scopes.length > 0 ? scopes.slice(0, 10) : undefined;
  }

  if (normalized.includes("scope")) {
    return (
      scopes[0] ??
      (subscriptionId ? `/subscriptions/${subscriptionId}` : undefined)
    );
  }

  if (normalized.includes("plan")) {
    return truncate(options.planText, 12000);
  }

  return undefined;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
