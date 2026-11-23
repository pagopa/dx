import { createRequire } from "node:module";

import coreConfig from "./core.json" with { type: "json" };

// Resolving from this module anchors every specifier to the installed package.
// A bare specifier is otherwise resolved from the consumer root, where
// `eslint-plugin-perfectionist` is absent because it is not a dependency there.
const require = createRequire(import.meta.url);

const anchorPlugins = (plugins = []) =>
  plugins.map((plugin) => ({
    ...plugin,
    specifier: require.resolve(plugin.specifier),
  }));

/**
 * Hands a JSON variant to a config that oxlint loads as a module.
 *
 * `.oxlintrc.json` reaches `core.json` through `extends`, which takes file
 * paths only and resolves them next to the overlay. An `oxlint.config.ts`
 * cannot: there `extends` holds config objects. This module merges the chain
 * explicitly and drops the keys that only make sense in a file oxlint resolves
 * itself:
 *
 * - `$schema` and `extends`, both covered by the merged object;
 * - `ignorePatterns`, whose patterns oxlint resolves against the directory of
 *   the declaring file. Next to the package they never match a consumer file,
 *   but inlined they would start ignoring the consumer's own paths.
 */
export const flatten = (overlay) => {
  const merged = {
    ...coreConfig,
    ...overlay,
    jsPlugins: anchorPlugins(overlay.jsPlugins ?? coreConfig.jsPlugins),
    overrides: [...(coreConfig.overrides ?? []), ...(overlay.overrides ?? [])],
    plugins: [...(coreConfig.plugins ?? []), ...(overlay.plugins ?? [])],
    rules: { ...coreConfig.rules, ...overlay.rules },
  };

  delete merged.$schema;
  delete merged.extends;
  delete merged.ignorePatterns;

  return merged;
};
