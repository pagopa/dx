import { createRequire } from "node:module";

import coreConfig from "./core.json" with { type: "json" };

// Resolving from this module anchors every specifier to the installed package.
// A bare specifier is otherwise resolved from the consumer root, where
// `eslint-plugin-perfectionist` is absent because it is not a dependency there.
const require = createRequire(import.meta.url);

const anchorPlugins = (plugins) =>
  plugins.map((plugin) => ({
    ...plugin,
    specifier: require.resolve(plugin.specifier),
  }));

/** Keys that only make sense in a JSON config file, not in a config object. */
const JSON_CONFIG_ONLY_KEYS = new Set(["$schema", "extends"]);

/**
 * Turns a JSON variant into a configuration object.
 *
 * `.oxlintrc.json` reaches `core.json` through `extends`, which takes file
 * paths and resolves them next to the overlay. A module config cannot: there
 * `extends` holds configuration objects, never paths, so the variant is nested
 * and oxlint merges the two layers the way it merges the JSON chain. That makes
 * `extends` and `$schema` meaningless, so they are dropped.
 *
 * `ignorePatterns` stays: oxlint roots the patterns of an extended
 * configuration at the file that declares them, so the ones in `core.json`
 * never match a consumer path.
 */
const toConfigObject = ({ jsPlugins, ...variant }) => {
  const config = Object.fromEntries(
    Object.entries(variant).filter(([key]) => !JSON_CONFIG_ONLY_KEYS.has(key)),
  );

  return jsPlugins
    ? { ...config, jsPlugins: anchorPlugins(jsPlugins) }
    : config;
};

/** Hands a JSON variant to a config that oxlint loads as a module. */
export const compose = (overlay) => ({
  extends: [toConfigObject(coreConfig), toConfigObject(overlay)],
});
