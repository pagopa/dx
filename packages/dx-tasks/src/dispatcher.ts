/** This module registers dx-tasks tasks and dispatches them from decoded inputs. */

import type { ReportStore } from "./report-store.ts";

export interface TaskDefinition<TPayload, TResult = void> {
  name: string;
  payloadSchema: {
    parse: (input: unknown) => TPayload;
  };
  run: (
    payload: TPayload,
    context: TaskRunContext,
  ) => Promise<TResult> | TResult;
}

export interface TaskDispatcher {
  dispatchTask: <TResult = void>(
    name: string,
    payload: unknown,
  ) => Promise<TResult>;
  registerTask: <TPayload, TResult = void>(
    task: TaskDefinition<TPayload, TResult>,
  ) => void;
}

export interface TaskDispatcherOptions {
  context?: TaskRunContext;
}

export interface TaskRunContext {
  reports?: ReportStore;
}

interface RegisteredTask {
  dispatch: (payload: unknown) => Promise<unknown>;
}

export const createTaskDispatcher = ({
  context = {},
}: TaskDispatcherOptions = {}): TaskDispatcher => {
  const tasks = new Map<string, RegisteredTask>();

  const registerTask = <TPayload, TResult = void>(
    task: TaskDefinition<TPayload, TResult>,
  ) => {
    if (tasks.has(task.name)) {
      throw new Error(`Task "${task.name}" is already registered`);
    }

    tasks.set(task.name, {
      dispatch: async (payload) => {
        const decodedPayload = task.payloadSchema.parse(payload);
        return task.run(decodedPayload, context);
      },
    });
  };

  const dispatchTask = async <TResult = void>(
    name: string,
    payload: unknown,
  ) => {
    const task = tasks.get(name);

    if (!task) {
      throw new Error(`Unknown task "${name}"`);
    }

    return (await task.dispatch(payload)) as TResult;
  };

  return {
    dispatchTask,
    registerTask,
  };
};
