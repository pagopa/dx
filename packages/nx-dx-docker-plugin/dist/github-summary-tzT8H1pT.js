let node_fs = require("node:fs");

//#region src/cli-args.ts
const parseArgs = (argv) => {
	const args = {};
	for (const raw of argv) {
		const match = /^--([^=]+)=([\s\S]*)$/.exec(raw);
		if (match) args[match[1]] = match[2];
	}
	return args;
};

//#endregion
//#region src/github-summary.ts
const appendSummary = (markdown) => {
	const summaryFile = process.env.GITHUB_STEP_SUMMARY;
	if (!summaryFile) return;
	try {
		(0, node_fs.appendFileSync)(summaryFile, `${markdown}\n`);
	} catch (err) {
		console.warn("[@pagopa/nx-dx-docker-plugin] Could not write to GITHUB_STEP_SUMMARY", err);
	}
};
const summarizeDockerPush = (projectDisplayName, imageName, tags) => {
	appendSummary(`### 🐳 ${projectDisplayName} — image pushed\n\n${tags.map((tag) => `- \`${imageName}:${tag}\``).join("\n")}`);
};
const summarizeDockerFailure = (projectDisplayName, action, exitCode) => {
	appendSummary(`### ❌ ${projectDisplayName} — docker ${action} failed (exit code ${exitCode})`);
};

//#endregion
Object.defineProperty(exports, 'parseArgs', {
  enumerable: true,
  get: function () {
    return parseArgs;
  }
});
Object.defineProperty(exports, 'summarizeDockerFailure', {
  enumerable: true,
  get: function () {
    return summarizeDockerFailure;
  }
});
Object.defineProperty(exports, 'summarizeDockerPush', {
  enumerable: true,
  get: function () {
    return summarizeDockerPush;
  }
});