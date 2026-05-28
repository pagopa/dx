import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Integration tests to ensure the package can be resolved from the workspace root
 * in the way Nx Release expects when using
 * versionActions: "@pagopa/nx-terraform-plugin/release/version-actions"
 */
describe("Package resolution from workspace root", () => {
  const workspaceRoot = path.resolve(__dirname, "../../../..");
  const packageName = "@pagopa/nx-terraform-plugin/release/version-actions";

  it("should resolve package using require.resolve from repo root", () => {
    // This is what Nx Release does internally when resolving versionActions
    const result = spawnSync(
      "node",
      [
        "-e",
        `try { console.log(require.resolve('${packageName}')); process.exit(0); } catch (e) { console.error(e.message); process.exit(1); }`,
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf-8",
        shell: false,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("nx-terraform-plugin");
    expect(result.stderr).toBe("");
  });

  it("should resolve to a TypeScript source file ending with .ts", () => {
    // Nx checks if the resolved path ends with .ts and registers TypeScript transpilation
    const result = spawnSync(
      "node",
      [
        "-e",
        `try { const resolved = require.resolve('${packageName}'); console.log(resolved); process.exit(resolved.endsWith('.ts') ? 0 : 1); } catch (e) { console.error(e.message); process.exit(1); }`,
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf-8",
        shell: false,
      },
    );

    expect(result.status).toBe(0);
    const resolvedPath = result.stdout.trim();
    expect(resolvedPath).toMatch(/\.ts$/);
    expect(resolvedPath).toContain("/src/release/version-actions.ts");
  });

  it("should expose TerraformVersionActions as the default export", () => {
    const result = spawnSync(
      "node",
      [
        "-e",
        `
        const fs = require('fs');
        const resolved = require.resolve('${packageName}');
        const source = fs.readFileSync(resolved, 'utf-8');
        const hasNamedExport = source.includes('export class TerraformVersionActions');
        const hasDefaultExport = source.includes('export default class TerraformVersionActions');
        console.log(JSON.stringify({ hasDefaultExport, hasNamedExport, resolved }));
        process.exit(hasDefaultExport && !hasNamedExport ? 0 : 1);
        `,
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf-8",
        shell: false,
      },
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.hasNamedExport).toBe(false);
    expect(output.hasDefaultExport).toBe(true);
    expect(output.resolved).toContain("/src/release/version-actions.ts");
  });

  it("should load the module with TypeScript transpilation like Nx does", () => {
    // Simulate Nx's actual loading behavior:
    // 1. Resolve the package name
    // 2. Register TypeScript transpilation (using tsx, ts-node, or similar)
    // 3. Require the resolved path
    // 4. Verify the default export is the TerraformVersionActions class
    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "tsx",
        "--eval",
        `
        try {
          // Step 1: Resolve the package name (what Nx does)
          const resolved = require.resolve('${packageName}');
          
          // Step 2: Require the resolved path (with TS transpilation active via tsx)
           const module = require(resolved);
           
            // Step 3: Verify the module structure
            const hasDefault = typeof module.default === 'function';
            const hasVersionActions =
              typeof module.TerraformVersionActions === 'function';
            
            // Step 4: Verify the default export is the TerraformVersionActions class
            const className = module.default?.name || '';
            
            const result = {
              hasDefault,
              hasVersionActions,
              className,
              classType: typeof module.default,
              namedExports: Object.keys(module),
            };
            
            console.log(JSON.stringify(result, null, 2));
            process.exit(hasDefault && !hasVersionActions ? 0 : 1);
         } catch (e) {
           console.error('Error:', e.message);
          console.error('Stack:', e.stack);
          process.exit(1);
        }
        `,
      ],
      {
        cwd: workspaceRoot,
        encoding: "utf-8",
        shell: false,
      },
    );

    expect(result.status).toBe(0);

    // Parse the full JSON output (it's pretty-printed across multiple lines)
    const output = JSON.parse(result.stdout.trim());

    // Verify only the default export is present
    expect(output.hasDefault).toBe(true);
    expect(output.hasVersionActions).toBe(false);
    expect(output.classType).toBe("function");
    expect(output.className).toBe("TerraformVersionActions");
    expect(output.namedExports).toContain("default");
  }, 15_000);
});
