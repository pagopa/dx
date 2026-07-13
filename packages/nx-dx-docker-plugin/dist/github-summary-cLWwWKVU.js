let node_fs = require("node:fs");

//#region src/github-summary.ts
const appendSummary = (markdown, env) => {
	const summaryFile = env.GITHUB_STEP_SUMMARY;
	if (!summaryFile) return;
	try {
		(0, node_fs.appendFileSync)(summaryFile, `${markdown}\n`);
	} catch (err) {
		console.warn("[@pagopa/nx-dx-docker-plugin] Could not write to GITHUB_STEP_SUMMARY", err);
	}
};
const summarizeDockerPush = (projectDisplayName, imageName, tags, env = process.env) => {
	appendSummary(`### 🐳 ${projectDisplayName} — image pushed\n\n${tags.map((tag) => `- \`${imageName}:${tag}\``).join("\n")}`, env);
};
const summarizeDockerFailure = (projectDisplayName, action, exitCode, env = process.env) => {
	appendSummary(`### ❌ ${projectDisplayName} — docker ${action} failed (exit code ${exitCode})`, env);
};

//#endregion
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