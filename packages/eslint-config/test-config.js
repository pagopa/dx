const loadOptionalPlugin = async (packageName) => {
  try {
    return (await import(packageName)).default;
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      error.message.includes(packageName)
    ) {
      return undefined;
    }

    throw error;
  }
};

const [vitestPlugin, jestPlugin] = await Promise.all([
  loadOptionalPlugin("@vitest/eslint-plugin"),
  loadOptionalPlugin("eslint-plugin-jest"),
]);

if (vitestPlugin === undefined && jestPlugin === undefined) {
  throw new Error(
    "No supported test framework ESLint plugin was found. Install @vitest/eslint-plugin for Vitest or eslint-plugin-jest for Jest.",
  );
}

const pluginConfig = vitestPlugin ?? jestPlugin;
const testFramework = pluginConfig === vitestPlugin ? "vitest" : "jest";

const rules = Object.fromEntries(
  [
    "prefer-called-with",
    "prefer-equality-matcher",
    "prefer-expect-resolves",
    "prefer-spy-on",
    "prefer-todo",
  ].map((rule) => [`${testFramework}/${rule}`, "error"]),
);

export default {
  files: [
    "**/tests/**/*.{js,ts,tsx}",
    "**/__tests__/**/*.{js,ts,tsx}",
    "**/*.{test,spec}.{js,ts,tsx}",
  ],
  ...pluginConfig,
  rules: {
    ...pluginConfig.rules,
    "@typescript-eslint/no-empty-function": "off",
    ...rules,
  },
};
