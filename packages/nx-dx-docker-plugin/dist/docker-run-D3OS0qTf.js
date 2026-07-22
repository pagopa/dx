const require_docker_image = require('./docker-image-DgdWlpzQ.js');
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");
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
//#region src/docker-run.ts
const nonEmptyString = zod_v4.z.string().min(1);
const dockerRunOptionsSchema = zod_v4.z.object({
	contextPath: nonEmptyString.default("."),
	defaultBranch: nonEmptyString,
	dockerfilePath: nonEmptyString,
	imageAuthors: nonEmptyString,
	imageName: nonEmptyString,
	imageUrl: nonEmptyString,
	platform: nonEmptyString.default("linux/amd64,linux/arm64"),
	projectDisplayName: nonEmptyString,
	projectRoot: nonEmptyString
});
const getCommitSha = () => {
	try {
		return (0, node_child_process.execFileSync)("git", ["rev-parse", "HEAD"], {
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
	} catch {
		return process.env.GITHUB_SHA ?? "unknown";
	}
};
/**
* Runs `docker build`/`docker buildx build --push` with full OCI labels and
* a multi-tag strategy (RFC-DX-076 feature parity with
* `docker/metadata-action`). Shared by the `docker:build` and `docker:push`
* executors, which differ only in whether they add the local untagged
* alias tag (`build`) or `--push`/annotations (`push`).
*
* `workspaceRoot` (the executor's `context.root`, not `process.cwd()`) is
* used as the docker build's `cwd`, so the workspace-relative `contextPath`
* and `dockerfilePath` always resolve correctly, regardless of the directory
* an operator happens to invoke `nx` from. Generated targets default to a
* monorepo-root context (`.`) and `{projectRoot}/Dockerfile`, per
* RFC-DX-076's Option 4; projects can override either path independently.
*/
const runDockerCommand = (mode, options, workspaceRoot, releaseVersion) => {
	const { contextPath, defaultBranch, dockerfilePath, imageAuthors, imageName, imageUrl, platform, projectDisplayName, projectRoot } = options;
	const tags = releaseVersion ? require_docker_image.computeReleaseTags(projectDisplayName, releaseVersion) : require_docker_image.computeImageTags(projectDisplayName, defaultBranch);
	if (releaseVersion && tags.length === 0) {
		console.error(`[@pagopa/nx-dx-docker-plugin] '${releaseVersion}' is not a Docker-compatible semantic version for ${projectDisplayName}.`);
		return { success: false };
	}
	if (mode === "push" && tags.length === 0) {
		console.log(`[@pagopa/nx-dx-docker-plugin] No CI tags detected for ${imageName} (not running in a GitHub Actions job) — skipping publish.`);
		return { success: true };
	}
	const publishTags = tags.length > 0 ? tags : ["dev"];
	const labels = {
		authors: imageAuthors,
		created: (/* @__PURE__ */ new Date()).toISOString(),
		revision: getCommitSha(),
		source: imageUrl,
		title: projectDisplayName,
		url: imageUrl
	};
	const dockerArgs = [
		"build",
		contextPath,
		"--file",
		dockerfilePath,
		"--platform",
		platform
	];
	if (mode === "build") dockerArgs.push("--tag", require_docker_image.getProjectSlug(projectRoot));
	for (const tag of publishTags) dockerArgs.push("--tag", `${imageName}:${tag}`);
	for (const [key, value] of Object.entries(labels)) dockerArgs.push("--label", `org.opencontainers.image.${key}=${value}`);
	dockerArgs.push("--provenance=false");
	if (mode === "push") {
		dockerArgs.push("--push");
		for (const [key, value] of Object.entries(labels)) dockerArgs.push("--annotation", `index,manifest:org.opencontainers.image.${key}=${value}`);
	}
	const exitCode = (0, node_child_process.spawnSync)("docker", dockerArgs, {
		cwd: workspaceRoot,
		env: {
			...process.env,
			DOCKER_BUILDKIT: "1",
			SOURCE_DATE_EPOCH: "0"
		},
		stdio: "inherit"
	}).status ?? 1;
	if (exitCode !== 0) {
		summarizeDockerFailure(projectDisplayName, mode, exitCode);
		return { success: false };
	}
	if (mode === "push") summarizeDockerPush(projectDisplayName, imageName, publishTags);
	return { success: true };
};

//#endregion
Object.defineProperty(exports, 'dockerRunOptionsSchema', {
  enumerable: true,
  get: function () {
    return dockerRunOptionsSchema;
  }
});
Object.defineProperty(exports, 'runDockerCommand', {
  enumerable: true,
  get: function () {
    return runDockerCommand;
  }
});