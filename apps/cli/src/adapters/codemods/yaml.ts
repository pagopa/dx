import * as YAML from "yaml";

export const isChildOf = (
  path: Parameters<YAML.visitorFn<unknown>>[2],
  key: string,
) => {
  const ancestor = path.at(-1);
  return (
    YAML.isPair(ancestor) &&
    YAML.isScalar(ancestor.key) &&
    typeof ancestor.key.value === "string" &&
    ancestor.key.value === key
  );
};
