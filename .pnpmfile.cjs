// Published dependencies on workspace packages that live only on GitHub
// Packages are rewritten to pnpm's `gh:` alias, so consumers resolve them from
// GitHub Packages without mapping the whole @pagopa scope to that registry.
const fs = require("node:fs");
const path = require("node:path");

const GITHUB_PACKAGES_REGISTRY = "https://npm.pkg.github.com/";
const DEPENDENCY_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf-8"));

const getWorkspacePackageDirectories = () => {
  const workspaceFile = fs.readFileSync(
    path.join(__dirname, "pnpm-workspace.yaml"),
    "utf-8",
  );
  const patterns = [];
  let inPackages = false;
  for (const line of workspaceFile.split("\n")) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const match = /^\s+-\s+["']?([^"'\s]+)["']?\s*$/.exec(line);
      if (match) {
        patterns.push(match[1]);
      } else if (/^\S/.test(line)) {
        break;
      }
    }
  }
  return patterns.flatMap((pattern) => {
    if (!pattern.endsWith("/*")) {
      return [path.join(__dirname, pattern)];
    }
    const parent = path.join(__dirname, pattern.slice(0, -2));
    return fs.existsSync(parent)
      ? fs
          .readdirSync(parent, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(parent, entry.name))
      : [];
  });
};

let githubOnlyPackages;
const getGitHubOnlyPackages = () => {
  if (!githubOnlyPackages) {
    githubOnlyPackages = new Set(
      getWorkspacePackageDirectories()
        .map((directory) => path.join(directory, "package.json"))
        .filter((file) => fs.existsSync(file))
        .map(readJson)
        .filter(
          (pkg) =>
            pkg.name &&
            !pkg.private &&
            pkg.publishConfig?.registry === GITHUB_PACKAGES_REGISTRY,
        )
        .map((pkg) => pkg.name),
    );
  }
  return githubOnlyPackages;
};

function beforePacking(pkg) {
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (getGitHubOnlyPackages().has(name) && !range.startsWith("gh:")) {
        pkg[field][name] = `gh:${name}@${range}`;
      }
    }
  }
  return pkg;
}

module.exports = { hooks: { beforePacking } };
