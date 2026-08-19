/**
 * Turns Copilot JSONL stdout into concise progress lines.
 *
 * The runner keeps the full event log on disk. Verbose mode only surfaces
 * phase changes, tool names, and usage — never the full assistant payload.
 */
import { z } from "zod";

export type CopilotProgressEvent = Readonly<{
  message: string;
  properties: Record<string, unknown>;
}>;

const eventSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
});

const skillSchema = z.object({
  name: z.string(),
});

const toolRequestSchema = z
  .object({
    name: z.string().optional(),
    toolName: z.string().optional(),
  })
  .catchall(z.unknown());

const interestingTypes = new Set([
  "assistant.message",
  "error",
  "session.end",
  "session.idle",
  "session.skills_loaded",
  "session.start",
  "tool.execution_complete",
  "tool.execution_start",
]);

const toolName = (request: unknown): string | undefined => {
  const parsed = toolRequestSchema.safeParse(request);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data.name ?? parsed.data.toolName;
};

const skillNames = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((skill) => {
    const parsed = skillSchema.safeParse(skill);
    return parsed.success ? [parsed.data.name] : [];
  });
};

const summarizeAssistant = (
  data: Readonly<Record<string, unknown>>,
): CopilotProgressEvent | undefined => {
  const requests = Array.isArray(data.toolRequests) ? data.toolRequests : [];
  const names = requests.flatMap((request) => {
    const name = toolName(request);
    return name ? [name] : [];
  });
  if (names.length > 0) {
    return {
      message: "Requested tools {tools}",
      properties: { tools: names.join(", ") },
    };
  }

  const content = typeof data.content === "string" ? data.content : "";
  if (!content) {
    return undefined;
  }
  return {
    message: "Assistant replied ({chars} chars)",
    properties: { chars: content.length },
  };
};

const summarizeTool = (
  type: string,
  data: Readonly<Record<string, unknown>>,
): CopilotProgressEvent | undefined => {
  const name =
    (typeof data.toolName === "string" && data.toolName) ||
    (typeof data.name === "string" && data.name) ||
    undefined;
  if (!name) {
    return undefined;
  }
  return {
    message:
      type === "tool.execution_start"
        ? "Started tool {tool}"
        : "Finished tool {tool}",
    properties: { tool: name },
  };
};

/** Returns a concise log line for a Copilot JSONL event, or undefined. */
export const describeCopilotEvent = (
  line: string,
): CopilotProgressEvent | undefined => {
  try {
    const parsed = eventSchema.safeParse(JSON.parse(line));
    if (!parsed.success) {
      return undefined;
    }

    const event = parsed.data;
    const type = event.type;
    if (!type || !interestingTypes.has(type)) {
      return undefined;
    }

    const data = event.data ?? {};

    if (type === "session.start") {
      return { message: "Copilot session started", properties: {} };
    }
    if (type === "session.end") {
      return { message: "Copilot session ended", properties: {} };
    }
    if (type === "session.idle") {
      return { message: "Copilot session idle", properties: {} };
    }
    if (type === "session.skills_loaded") {
      const skills = skillNames(data.skills);
      return {
        message: skills.length > 0 ? "Loaded skills {skills}" : "Loaded skills",
        properties: skills.length > 0 ? { skills: skills.join(", ") } : {},
      };
    }
    if (type === "assistant.message") {
      return summarizeAssistant(data);
    }
    if (type === "tool.execution_start" || type === "tool.execution_complete") {
      return summarizeTool(type, data);
    }
    if (type === "error") {
      const error =
        typeof data.message === "string"
          ? data.message
          : typeof event.name === "string"
            ? event.name
            : "unknown error";
      return { message: "Copilot error: {error}", properties: { error } };
    }

    return undefined;
  } catch {
    return undefined;
  }
};
