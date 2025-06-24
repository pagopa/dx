import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeNodeReader } from "../index";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

describe("makeNodeReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const directory = "/some/dir";

  it("parses scripts from yarn run --json output", async () => {
    const mockStdout =
      '{"name":"build","script":"aScript"}\n{"name":"code-review","script":"aCodeReviewScript"}';

    (execa as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      exitCode: 0,
      stdout: mockStdout,
    });

    const nodeReader = makeNodeReader();
    const scripts = await nodeReader.getScripts(directory);

    expect(scripts.length).toStrictEqual(2);
    expect(scripts).toStrictEqual([
      {
        name: "build",
        script: "aScript",
      },
      {
        name: "code-review",
        script: "aCodeReviewScript",
      },
    ]);

    expect(execa).toHaveBeenCalledWith("yarn", ["run", "--json"], {
      cwd: directory,
    });
  });

  it("should return an empty array", async () => {
    (execa as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      exitCode: 1,
      stdout: "aStdout",
    });

    const nodeReader = makeNodeReader();
    const scripts = await nodeReader.getScripts(directory);

    expect(scripts.length).toStrictEqual(0);
    expect(scripts).toStrictEqual([]);
  });
});
