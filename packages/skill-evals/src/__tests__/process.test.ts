/**
 * Verifies Copilot stdout can be teed to a line callback without losing the file.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { runCommandToFiles } from "../process.js";
import { temporaryDirectory } from "./temporary-directory.js";

describe("runCommandToFiles", () => {
  it("writes stdout to a file and forwards complete lines", async () => {
    const directory = await temporaryDirectory();
    const stdoutPath = join(directory, "stdout.log");
    const stderrPath = join(directory, "stderr.log");
    const lines: string[] = [];

    const exitCode = await runCommandToFiles(
      process.execPath,
      ["-e", "process.stdout.write('alpha\\nbeta\\n')"],
      {
        onStdoutLine: (line) => lines.push(line),
        stderrPath,
        stdoutPath,
      },
    );

    expect(exitCode).toBe(0);
    expect(lines).toEqual(["alpha", "beta"]);
    await expect(readFile(stdoutPath, "utf8")).resolves.toBe("alpha\nbeta\n");
  });
});
