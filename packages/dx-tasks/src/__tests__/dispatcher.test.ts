import { afterEach, describe, expect, it, vi } from "vitest";

import { createTaskDispatcher } from "../dispatcher.ts";
import { Reporter } from "../reporter.ts";

describe("createTaskDispatcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches a registered task after decoding its payload", async () => {
    const reporter = new Reporter(process.cwd());
    const parse = vi.fn((input: unknown) => ({
      modulePath:
        typeof input === "object" &&
        input !== null &&
        "modulePath" in input &&
        typeof input.modulePath === "string"
          ? input.modulePath
          : "",
      verbose:
        typeof input === "object" &&
        input !== null &&
        "verbose" in input &&
        input.verbose === true,
    }));
    const run = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createTaskDispatcher({
      context: { reporter },
    });

    dispatcher.registerTask({
      name: "customTask",
      payloadSchema: { parse },
      run,
    });

    await dispatcher.dispatchTask("customTask", {
      modulePath: "/tmp/module",
      verbose: true,
    });

    expect(parse).toHaveBeenCalledWith({
      modulePath: "/tmp/module",
      verbose: true,
    });
    expect(run).toHaveBeenCalledWith(
      {
        modulePath: "/tmp/module",
        verbose: true,
      },
      {
        reporter,
      },
    );
  });

  it("throws when dispatching an unknown task", async () => {
    const dispatcher = createTaskDispatcher();

    await expect(dispatcher.dispatchTask("missingTask", {})).rejects.toThrow(
      'Unknown task "missingTask"',
    );
  });

  it("throws when registering the same task twice", () => {
    const dispatcher = createTaskDispatcher();
    const task = {
      name: "customTask",
      payloadSchema: {
        parse: (input: unknown) => input,
      },
      run: vi.fn(),
    };

    dispatcher.registerTask(task);

    expect(() => {
      dispatcher.registerTask(task);
    }).toThrow('Task "customTask" is already registered');
  });
});
