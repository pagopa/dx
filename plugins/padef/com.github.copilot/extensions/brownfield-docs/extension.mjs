import { createCanvas, joinSession } from "@github/copilot-sdk/extension";
// Registers the brownfield documentation canvas with the current Copilot session.

import { startServer } from "./server.mjs";
import { findUseCasesPrompt, syncPrompt } from "./sync-prompt.mjs";
import { createWorkspaceContext } from "./workspace-context.mjs";

const instances = new Map();
const session = await joinSession({
  canvases: [
    createCanvas({
      actions: [
        {
          description:
            "Read saved repositories, active and archived actors, use cases and entities, and storage path.",
          handler: async ({ instanceId }) => {
            const instance = await getInstance(instanceId);
            return {
              ...(await instance.actorState.read()),
              currentRepository: instance.currentRepository,
            };
          },
          name: "read_actors",
        },
        {
          description:
            "Append findings, classify existing actors, and reword active use cases using a state revision.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["revision", "actors", "useCases"],
            properties: {
              revision: { type: ["string", "null"], pattern: "^[0-9a-f]{64}$" },
              actors: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "description"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    role: { type: "string", enum: ["Primary", "Supporting"] },
                    sourceRevisions: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["fullName", "sha"],
                        properties: {
                          fullName: { type: "string" },
                          sha: { type: "string", pattern: "^[0-9a-f]{40}$" },
                        },
                      },
                    },
                  },
                },
              },
              actorRoleUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["actorName", "role"],
                  properties: {
                    actorId: { type: "string", minLength: 1 },
                    actorName: { type: "string", minLength: 1 },
                    role: { type: "string", enum: ["Primary", "Supporting"] },
                  },
                },
              },
              useCases: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "description", "actorNames"],
                  properties: {
                    title: { type: "string" },
                    description: {
                      type: "string",
                      minLength: 1,
                      description:
                        "Functional flow in at most five sentences, without implementation details.",
                    },
                    actorNames: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 1,
                      uniqueItems: true,
                    },
                    sourceRevisions: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["fullName", "sha"],
                        properties: {
                          fullName: { type: "string" },
                          sha: { type: "string", pattern: "^[0-9a-f]{40}$" },
                        },
                      },
                    },
                  },
                },
              },
              sourceUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "name", "sourceRevisions"],
                  properties: {
                    kind: { type: "string", enum: ["actor", "useCase"] },
                    id: { type: "string", minLength: 1 },
                    name: { type: "string", minLength: 1 },
                    sourceRevisions: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["fullName", "sha"],
                        properties: {
                          fullName: { type: "string" },
                          sha: { type: "string", pattern: "^[0-9a-f]{40}$" },
                        },
                      },
                    },
                  },
                },
              },
              useCaseUpdates: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "originalTitle",
                    "title",
                    "description",
                    "renamedActorName",
                    "actorNames",
                  ],
                  properties: {
                    useCaseId: { type: "string", minLength: 1 },
                    originalTitle: { type: "string", minLength: 1 },
                    title: { type: "string", minLength: 1 },
                    description: { type: "string", minLength: 1 },
                    renamedActorName: { type: "string", minLength: 1 },
                    actorNames: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 1,
                      uniqueItems: true,
                    },
                  },
                },
              },
            },
          },
          handler: async ({ input, instanceId }) => {
            const instance = await getInstance(instanceId);
            return instance.actorState.addFindings(input);
          },
          name: "add_findings",
        },
      ],
      description:
        "Manage code repositories, actors and use cases in persistent repository JSON state.",
      displayName: "Brownfield documentation",
      id: "brownfield-docs",
      inputSchema: {
        additionalProperties: false,
        properties: {},
        type: "object",
      },
      onClose: async (ctx) => {
        const pending = instances.get(ctx.instanceId);
        instances.delete(ctx.instanceId);
        if (pending) await (await pending).server.close();
      },
      open: async (ctx) => {
        if (!instances.has(ctx.instanceId)) {
          const pending = createWorkspaceContext(
            ctx.session?.workingDirectory,
          ).then(async (workspace) => ({
            ...workspace,
            server: await startServer(
              workspace.actorState,
              workspace.currentRepository,
              () => session.send({ prompt: syncPrompt(ctx.instanceId) }),
              () =>
                session.send({ prompt: findUseCasesPrompt(ctx.instanceId) }),
            ),
          }));
          instances.set(ctx.instanceId, pending);
          pending.catch(() => instances.delete(ctx.instanceId));
        }
        const entry = await instances.get(ctx.instanceId);
        return {
          title: "Brownfield documentation",
          url: entry.server.url,
        };
      },
    }),
  ],
});

async function getInstance(instanceId) {
  const instance = instances.get(instanceId);
  if (!instance) throw new Error("Open the canvas before using its actions.");
  return instance;
}
