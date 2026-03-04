import { describe, expect, it } from "vitest";

import { buildPrBody } from "../nx-release-version.js";

const INTRO_PREFIX =
  "This PR was opened by the [Nx Release](https://github.com/pagopa/dx/tree/main/actions/nx-release) GitHub Action.";

describe("buildPrBody", () => {
  it("returns fallback text when projectChangelogs is undefined", () => {
    const body = buildPrBody(undefined);
    expect(body).toContain(INTRO_PREFIX);
    expect(body).toContain("See individual packages CHANGELOGs for details.");
  });

  it("returns fallback text when projectChangelogs is empty", () => {
    const body = buildPrBody({});
    expect(body).toContain("See individual packages CHANGELOGs for details.");
  });

  it("includes changelog contents when present", () => {
    const body = buildPrBody({
      "@pagopa/foo": { contents: "## 1.1.0\n\n- feat: something" },
    });
    expect(body).toContain("## 1.1.0");
    expect(body).toContain("feat: something");
  });

  it("sorts entries alphabetically by project name", () => {
    const body = buildPrBody({
      "@pagopa/aaa": { contents: "## aaa-content" },
      "@pagopa/zzz": { contents: "## zzz-content" },
    });
    const aPos = body.indexOf("aaa-content");
    const zPos = body.indexOf("zzz-content");
    expect(aPos).toBeLessThan(zPos);
  });

  it("trims whitespace from each entry", () => {
    const body = buildPrBody({
      "@pagopa/foo": { contents: "  ## 1.0.0  \n\n" },
    });
    expect(body).not.toMatch(/^\s+/);
    expect(body).not.toMatch(/\s+$/);
  });

  it("filters out empty changelog entries", () => {
    const body = buildPrBody({
      "@pagopa/empty": { contents: "   " },
      "@pagopa/real": { contents: "## 2.0.0\n\n- fix: bug" },
    });
    expect(body).toContain("## 2.0.0");
    expect(body).not.toContain(
      "See individual packages CHANGELOGs for details.",
    );
  });
});
