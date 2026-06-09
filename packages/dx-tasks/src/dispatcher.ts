/** This module registers dx-tasks tasks and dispatches them from decoded inputs. */

export interface TaskDefinition<TPayload> {
  name: string;
  payloadSchema: {
    parse: (input: unknown) => TPayload;
  };
  run: (payload: TPayload) => Promise<void> | void;
}

export interface TaskDispatcher {
  dispatchTask: (name: string, payload: unknown) => Promise<void>;
  registerTask: <TPayload>(task: TaskDefinition<TPayload>) => void;
}

interface RegisteredTask {
  dispatch: (payload: unknown) => Promise<void>;
}

export const createTaskDispatcher = (): TaskDispatcher => {
  const tasks = new Map<string, RegisteredTask>();

  const registerTask = <TPayload>(task: TaskDefinition<TPayload>) => {
    if (tasks.has(task.name)) {
      throw new Error(`Task "${task.name}" is already registered`);
    }

    tasks.set(task.name, {
      dispatch: async (payload) => {
        const decodedPayload = task.payloadSchema.parse(payload);
        await task.run(decodedPayload);
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
