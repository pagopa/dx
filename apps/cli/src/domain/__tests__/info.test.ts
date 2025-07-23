import { describe, expect, it } from "vitest";

import { getInfo } from "../info.js";
import { makeMockDependencies, makeMockPackageJson } from "./data.js";

describe("getInfo", () => {
  it("should return default packageManager (npm) when packageManager is not detected", () => {
    const mockPackageJson = makeMockPackageJson({ packageManager: undefined });
    const mockDependencies = {
      ...makeMockDependencies(),
      packageJson: mockPackageJson,
    };
    const result = getInfo(mockDependencies);
    expect(result.packageManager).toStrictEqual("npm");
  });

  it("should return the packageManager when present in the package.json", () => {
    const mockDependencies = makeMockDependencies();
    const result = getInfo(mockDependencies);
    expect(result.packageManager).toStrictEqual("pnpm");
  });
});
