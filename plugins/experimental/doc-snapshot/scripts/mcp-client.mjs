// Deterministic OAuth-backed transport adapter; no prompts or model-generated API arguments.
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import { validated } from "./snapshot-core.mjs";

export async function withAtlassian(run) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL("../node_modules/mcp-remote/dist/proxy.js", import.meta.url)),
      "https://mcp.atlassian.com/v2/mcp", "--auth-timeout", "300",
    ],
    stderr: "inherit",
  });
  const client = new Client({ name: "padef-doc-snapshot", version: "0.0.1" });
  try {
    await client.connect(transport, { timeout: 360_000 });
    const call = async (name, args) => {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
      const texts = validated(z.array(z.object({
        type: z.string(), text: z.string().optional(),
      }).passthrough()), result.content ?? [], "MCP content");
      if (result.isError) {
        throw new Error(`Atlassian MCP ${name}: ${texts.map((c) => c.text ?? "").join("\n")}`);
      }
      const payload = result.structuredContent ??
        JSON.parse(texts.filter((c) => c.type === "text").map((c) => c.text).join("\n"));
      return validated(z.object({ data: z.unknown() }).passthrough(), payload, `MCP ${name}`).data;
    };
    return await run(call, client);
  } finally {
    await client.close();
    await transport.close();
  }
}
