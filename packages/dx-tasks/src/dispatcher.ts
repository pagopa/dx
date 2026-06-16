/** This module registers dx-tasks tasks and dispatches them from decoded inputs. */

import type { ReportStore } from "./report-store.ts";

export interface TaskDefinition<TPayload> {
  name: string;
  payloadSchema: {
    parse: (input: unknown) => TPayload;
  };
  run: (payload: TPayload, context: TaskRunContext) => Promise<void> | void;
}

export interface TaskDispatcher {
  dispatchTask: (name: string, payload: unknown) => Promise<void>;
  registerTask: <TPayload>(task: TaskDefinition<TPayload>) => void;
}

export interface TaskDispatcherOptions {
  context?: TaskRunContext;
}

export interface TaskRunContext {
  reports?: ReportStore;
}

interface RegisteredTask {
  dispatch: (payload: unknown) => Promise<void>;
}

export const createTaskDispatcher = ({
  context = {},
}: TaskDispatcherOptions = {}): TaskDispatcher => {
  const tasks = new Map<string, RegisteredTask>();

  const registerTask = <TPayload>(task: TaskDefinition<TPayload>) => {
    if (tasks.has(task.name)) {
      throw new Error(`Task "${task.name}" is already registered`);
    }

    tasks.set(task.name, {
      dispatch: async (payload) => {
        const decodedPayload = task.payloadSchema.parse(payload);
        await task.run(decodedPayload, context);
      },
    });
  };

  const dispatchTask = async (name: string, payload: unknown) => {
    const task = tasks.get(name);

    if (!task) {
      throw new Error(`Unknown task "${name}"`);
    }

    await task.dispatch(payload);
  };

  return {
    dispatchTask,
    registerTask,
  };
};
