const require_docker_image = require('./docker-image-D-GedRN7.js');
const require_github_summary = require('./github-summary-cLWwWKVU.js');
let node_child_process = require("node:child_process");
let zod_v4 = require("zod/v4");

//#region src/docker-run.ts
const nonEmptyString = zod_v4.z.string().min(1);
const dockerRunOptionsSchema = zod_v4.z.object({
	defaultBranch: nonEmptyString,
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
* used as the docker build's `cwd`, so the build context (`.`) is always
* the monorepo root and `--file {projectRoot}/Dockerfile` always resolves
* correctly — per RFC-DX-076's Option 4 (Docker context at the monorepo
* root, full build inside Docker), regardless of the directory an
* operator happens to invoke `nx` from.
*/
const runDockerCommand = (mode, options, workspaceRoot) => {
	const { defaultBranch, imageAuthors, imageName, imageUrl, platform, projectDisplayName, projectRoot } = options;
	const tags = require_docker_image.computeImageTags(projectDisplayName, defaultBranch);
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
		".",
		"--file",
		`${projectRoot}/Dockerfile`,
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
		require_github_summary.summarizeDockerFailure(projectDisplayName, mode, exitCode);
		return { success: false };
	}
	if (mode === "push") require_github_summary.summarizeDockerPush(projectDisplayName, imageName, publishTags);
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