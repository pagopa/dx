import fs from "node:fs/promises";
import path from "node:path";
import * as z$1 from "zod/mini";
import { Octokit } from "octokit";
import { z } from "zod/v4";
import util, { promisify } from "node:util";
import childProcess, { execFile } from "node:child_process";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import os from "node:os";

//#region ../dx-tasks/dist/dispatcher.js
/** This module registers dx-tasks tasks and dispatches them from decoded inputs. */
const createTaskDispatcher = ({ context = {} } = {}) => {
	const tasks = /* @__PURE__ */ new Map();
	const registerTask = (task) => {
		if (tasks.has(task.name)) throw new Error(`Task "${task.name}" is already registered`);
		tasks.set(task.name, { dispatch: async (payload) => {
			const decodedPayload = task.payloadSchema.parse(payload);
			return task.run(decodedPayload, context);
		} });
	};
	const dispatchTask = async (name, payload) => {
		const task = tasks.get(name);
		if (!task) throw new Error(`Unknown task "${name}"`);
		return task.dispatch(payload);
	};
	return {
		dispatchTask,
		registerTask
	};
};

//#endregion
//#region ../dx-tasks/dist/report-store.js
/** This module stores and renders dx-tasks reports under a per-namespace directory tree. */
const nonEmptyStringSchema$4 = z$1.string().check(z$1.minLength(1));
const readReports = async (directoryPath) => {
	let entries;
	try {
		entries = await fs.readdir(directoryPath);
	} catch (cause) {
		if (cause instanceof Error && cause.code === "ENOENT") return [];
		throw new Error(`Failed to read report directory "${directoryPath}"`, { cause });
	}
	return Promise.all(entries.filter((entry) => entry.endsWith(".json")).sort((a, b) => a.localeCompare(b)).map(async (fileName) => {
		const filePath = path.join(directoryPath, fileName);
		try {
			return JSON.parse(await fs.readFile(filePath, "utf8"));
		} catch (cause) {
			throw new Error(`Failed to read report file "${filePath}"`, { cause });
		}
	}));
};
var ReportStore = class {
	namespaces = /* @__PURE__ */ new Map();
	rootDirectoryPath;
	constructor(baseDirectoryPath = process.cwd()) {
		this.rootDirectoryPath = path.join(baseDirectoryPath, ".dx-tasks");
	}
	register(namespace) {
		const name = nonEmptyStringSchema$4.parse(namespace.name);
		if (this.namespaces.has(name)) throw new Error(`Report namespace "${name}" is already registered`);
		this.namespaces.set(name, namespace);
		return this;
	}
	async render(format = "markdown", context = {}) {
		const sections = [];
		for (const namespace of this.namespaces.values()) {
			const renderReports = namespace.renderers?.[format];
			if (!renderReports) continue;
			const directoryPath = path.join(this.rootDirectoryPath, namespace.name);
			const reports = (await readReports(directoryPath)).map((report) => namespace.schema.parse(report));
			if (reports.length === 0) continue;
			sections.push(renderReports(reports, context));
		}
		return sections.join("\n\n");
	}
	async write(namespaceName, objectName, content) {
		const name = nonEmptyStringSchema$4.parse(namespaceName);
		const namespace = this.namespaces.get(name);
		if (!namespace) throw new Error(`Report namespace "${name}" is not registered`);
		const report = namespace.schema.parse(content);
		const directoryPath = path.join(this.rootDirectoryPath, name);
		const filePath = path.join(directoryPath, `${nonEmptyStringSchema$4.parse(objectName)}.json`);
		try {
			await fs.mkdir(directoryPath, { recursive: true });
		} catch (cause) {
			throw new Error(`Failed to create reporter namespace directory "${directoryPath}"`, { cause });
		}
		try {
			await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
		} catch (cause) {
			throw new Error(`Failed to write reporter file "${filePath}"`, { cause });
		}
	}
};

//#endregion
//#region ../dx-tasks/dist/github/pr-comment.js
/** This module creates GitHub PR comments as a reusable dx-tasks task. */
const nonEmptyStringSchema$3 = z$1.string().check(z$1.minLength(1));
const prCommentPayloadShape = {
	commentBody: nonEmptyStringSchema$3,
	footer: z$1.optional(nonEmptyStringSchema$3),
	githubToken: z$1.optional(nonEmptyStringSchema$3),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema$3,
	repo: nonEmptyStringSchema$3,
	searchPattern: z$1.optional(nonEmptyStringSchema$3),
	title: z$1.optional(nonEmptyStringSchema$3)
};
const payloadSchema$6 = z$1.object(prCommentPayloadShape);
const githubCommentShape = {
	body: z$1.optional(z$1.nullable(z$1.string())),
	id: z$1.number().check(z$1.int(), z$1.positive())
};
const githubCreatedCommentSchema = z$1.object({
	...githubCommentShape,
	html_url: z$1.string().check(z$1.minLength(1))
});
const githubCommentsSchema = z$1.array(z$1.object(githubCommentShape));
var OctokitPrCommentClient = class {
	octokit;
	constructor(token) {
		this.octokit = new Octokit({ auth: token });
	}
	async createComment({ issueNumber, owner, repo }, body) {
		const { data } = await this.octokit.rest.issues.createComment({
			body,
			issue_number: issueNumber,
			owner,
			repo
		});
		const comment = githubCreatedCommentSchema.parse(data);
		return {
			commentId: comment.id,
			commentUrl: comment.html_url
		};
	}
	async deleteComment(owner, repo, commentId) {
		await this.octokit.rest.issues.deleteComment({
			comment_id: commentId,
			owner,
			repo
		});
	}
	async listComments({ issueNumber, owner, repo }) {
		const comments = await this.octokit.paginate(this.octokit.rest.issues.listComments, {
			issue_number: issueNumber,
			owner,
			per_page: 100,
			repo
		});
		return githubCommentsSchema.parse(comments);
	}
};
const createOctokitPrCommentClient = (token) => new OctokitPrCommentClient(token);
const deleteMatchingComments = async (client, target, searchPattern) => {
	const normalizedPattern = searchPattern.trim().toLowerCase();
	const matchingComments = (await client.listComments(target)).filter((comment) => (comment.body ?? "").toLowerCase().includes(normalizedPattern));
	for (const comment of matchingComments) await client.deleteComment(target.owner, target.repo, comment.id);
};
const getGitHubToken = (githubToken) => {
	const token = githubToken ?? process.env.GITHUB_TOKEN;
	if (!token) throw new Error("GitHub token not found. Please provide githubToken or GITHUB_TOKEN environment variable");
	return token;
};
const formatCommentBody = ({ commentBody, footer, title }) => {
	const titledBody = title === void 0 ? commentBody : `## ${title}\n\n${commentBody}`;
	return footer === void 0 ? titledBody : `${titledBody}\n\n---\n\n${footer}`;
};
async function prComment({ commentBody, footer, githubToken, issueNumber, owner, repo, searchPattern, title }, context = {}, createClient = createOctokitPrCommentClient) {
	const target = {
		issueNumber,
		owner,
		repo
	};
	const client = createClient(getGitHubToken(githubToken));
	if (searchPattern) try {
		await deleteMatchingComments(client, target, searchPattern);
	} catch (error) {
		console.warn(`Failed to delete existing comments: ${error instanceof Error ? error.message : String(error)}`);
	}
	return client.createComment(target, formatCommentBody({
		commentBody,
		footer,
		title
	}));
}

//#endregion
//#region ../dx-tasks/dist/github/validate-terraform-environment-release.js
/** This module validates trusted Terraform environment releases through GitHub APIs. */
const nonEmptyStringSchema$2 = z.string().refine((value) => value.trim().length > 0, "String cannot be blank");
const commitShaSchema = z.string().regex(/^[0-9a-f]{40}$/i, "sourceRef must be a full Git commit SHA");
const normalizedProjectRootSchema = nonEmptyStringSchema$2.refine((projectRoot) => !projectRoot.includes("\\") && path.posix.normalize(projectRoot) === projectRoot && projectRoot.startsWith("infra/resources/") && path.posix.basename(projectRoot) !== "resources", "projectRoot must be a normalized Terraform environment path");
const payloadSchema$5 = z.object({
	owner: nonEmptyStringSchema$2,
	project: nonEmptyStringSchema$2,
	projectRoot: normalizedProjectRootSchema,
	repo: nonEmptyStringSchema$2,
	sourceRef: commitShaSchema
});
const resultSchema = z.object({
	applyEnvironment: nonEmptyStringSchema$2,
	planEnvironment: nonEmptyStringSchema$2,
	project: nonEmptyStringSchema$2,
	runnerLabel: nonEmptyStringSchema$2,
	sourceRef: commitShaSchema
});
const repositorySchema = z.object({ default_branch: nonEmptyStringSchema$2 });
const branchSchema = z.object({ protected: z.boolean() });
const comparisonSchema = z.object({ status: z.enum([
	"ahead",
	"behind",
	"diverged",
	"identical"
]) });
const fileContentSchema = z.object({
	content: nonEmptyStringSchema$2,
	encoding: z.literal("base64"),
	type: z.literal("file")
});
const environmentSchema = z.object({
	name: nonEmptyStringSchema$2,
	protection_rules: z.array(z.object({ type: nonEmptyStringSchema$2 })).optional()
});
const environmentPageSchema = z.object({ environments: z.array(environmentSchema) });
const environmentManifestSchema = z.object({
	deployment: z.object({
		applyEnvironment: nonEmptyStringSchema$2,
		planEnvironment: nonEmptyStringSchema$2,
		runnerLabel: nonEmptyStringSchema$2
	}).optional(),
	version: nonEmptyStringSchema$2
});
var OctokitTerraformEnvironmentReleaseClient = class {
	octokit;
	constructor(token) {
		this.octokit = new Octokit({ auth: token });
	}
	async compareCommits({ owner, repo }, base, head) {
		const { data } = await this.octokit.rest.repos.compareCommits({
			base,
			head,
			owner,
			repo
		});
		const parseResult = comparisonSchema.safeParse(data);
		if (!parseResult.success) throw new Error("GitHub returned an invalid commit comparison", { cause: parseResult.error });
		return parseResult.data.status;
	}
	async getDefaultBranch({ owner, repo }) {
		const repositoryResponse = await this.octokit.rest.repos.get({
			owner,
			repo
		});
		const repositoryResult = repositorySchema.safeParse(repositoryResponse.data);
		if (!repositoryResult.success) throw new Error("GitHub returned invalid repository metadata", { cause: repositoryResult.error });
		const branchResponse = await this.octokit.rest.repos.getBranch({
			branch: repositoryResult.data.default_branch,
			owner,
			repo
		});
		const branchResult = branchSchema.safeParse(branchResponse.data);
		if (!branchResult.success) throw new Error("GitHub returned invalid default branch metadata", { cause: branchResult.error });
		return {
			name: repositoryResult.data.default_branch,
			protected: branchResult.data.protected
		};
	}
	async getFileContent({ owner, repo }, filePath, ref) {
		const { data } = await this.octokit.rest.repos.getContent({
			owner,
			path: filePath,
			ref,
			repo
		});
		const parseResult = fileContentSchema.safeParse(data);
		if (!parseResult.success) throw new Error(`GitHub returned invalid content for "${filePath}"`, { cause: parseResult.error });
		return Buffer.from(parseResult.data.content, "base64").toString("utf8");
	}
	async listEnvironments({ owner, repo }) {
		const environments = [];
		const perPage = 100;
		for (let page = 1;; page += 1) {
			const { data } = await this.octokit.rest.repos.getAllEnvironments({
				owner,
				page,
				per_page: perPage,
				repo
			});
			const parseResult = environmentPageSchema.safeParse(data);
			if (!parseResult.success) throw new Error("GitHub returned invalid environment metadata", { cause: parseResult.error });
			environments.push(...parseResult.data.environments.map((environment) => ({
				name: environment.name,
				protectionRules: environment.protection_rules?.map(({ type }) => type) ?? []
			})));
			if (parseResult.data.environments.length < perPage) return environments;
		}
	}
};
const createOctokitTerraformEnvironmentReleaseClient = (token) => new OctokitTerraformEnvironmentReleaseClient(token);
const getExpectedProjectName = (projectRoot) => projectRoot.split("/").slice(1).map((part) => part === "_modules" ? "modules" : part.replaceAll("_", "-")).join("-");
const parseManifest = (manifestPath, content) => {
	let manifest;
	try {
		manifest = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to parse "${manifestPath}"`, { cause: error });
	}
	const parseResult = environmentManifestSchema.safeParse(manifest);
	if (!parseResult.success) throw new Error(`Manifest "${manifestPath}" is invalid`, { cause: parseResult.error });
	return parseResult.data;
};
const getDeploymentMetadata = (projectRoot, manifest) => manifest.deployment ?? {
	applyEnvironment: `infra-${path.posix.basename(projectRoot)}-cd`,
	planEnvironment: `infra-${path.posix.basename(projectRoot)}-ci`,
	runnerLabel: path.posix.basename(projectRoot)
};
async function validateTerraformEnvironmentRelease({ owner, project, projectRoot, repo, sourceRef }, context = {}, createClient = createOctokitTerraformEnvironmentReleaseClient) {
	if (!context.githubToken) throw new Error("GitHub token is required to validate a Terraform release");
	if (project !== getExpectedProjectName(projectRoot)) throw new Error(`Project "${project}" does not match root "${projectRoot}"`);
	const client = createClient(context.githubToken);
	const target = {
		owner,
		repo
	};
	const defaultBranch = await client.getDefaultBranch(target);
	if (!defaultBranch.protected) throw new Error(`Default branch "${defaultBranch.name}" is not protected`);
	const comparisonStatus = await client.compareCommits(target, sourceRef, defaultBranch.name);
	if (!["ahead", "identical"].includes(comparisonStatus)) throw new Error(`Commit "${sourceRef}" is not reachable from "${defaultBranch.name}"`);
	const manifestPath = `${projectRoot}/environment.json`;
	const manifest = parseManifest(manifestPath, await client.getFileContent(target, manifestPath, sourceRef));
	const deployment = getDeploymentMetadata(projectRoot, manifest);
	const environments = await client.listEnvironments(target);
	const planEnvironment = environments.find(({ name }) => name === deployment.planEnvironment);
	const applyEnvironment = environments.find(({ name }) => name === deployment.applyEnvironment);
	if (!planEnvironment) throw new Error(`Plan environment "${deployment.planEnvironment}" does not exist`);
	if (!applyEnvironment) throw new Error(`Apply environment "${deployment.applyEnvironment}" does not exist`);
	if (!applyEnvironment.protectionRules.includes("required_reviewers")) throw new Error(`Apply environment "${deployment.applyEnvironment}" has no required reviewers`);
	return resultSchema.parse({
		...deployment,
		project,
		sourceRef
	});
}

//#endregion
//#region ../dx-tasks/dist/render-report.js
/** This module renders persisted dx-tasks reports and prints them to stdout. */
const renderReportPayloadShape = { format: z$1._default(z$1.literal("markdown"), "markdown") };
const payloadSchema$4 = z$1.object(renderReportPayloadShape);
async function renderReport({ format = "markdown" }, context = {}) {
	if (!context.reports) throw new Error("renderReport requires reports in the task context");
	const renderedReport = await context.reports.render(format);
	console.log(renderedReport);
}

//#endregion
//#region ../dx-tasks/dist/report-pr-comment.js
/** This module renders persisted dx-tasks reports and posts them as GitHub PR comments. */
const nonEmptyStringSchema$1 = z$1.string().check(z$1.minLength(1));
const reportPrCommentPayloadShape = {
	footer: z$1.optional(nonEmptyStringSchema$1),
	format: z$1._default(z$1.literal("markdown"), "markdown"),
	githubToken: z$1.optional(nonEmptyStringSchema$1),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema$1,
	repo: nonEmptyStringSchema$1,
	searchPattern: z$1.optional(nonEmptyStringSchema$1),
	sourceUrl: z$1.optional(nonEmptyStringSchema$1),
	title: z$1.optional(nonEmptyStringSchema$1)
};
const payloadSchema$3 = z$1.object(reportPrCommentPayloadShape);
async function reportPrComment({ footer, format = "markdown", githubToken, issueNumber, owner, repo, searchPattern, sourceUrl, title }, context = {}, createClient) {
	if (!context.reports) throw new Error("reportPrComment requires reports in the task context");
	const renderedReport = await context.reports.render(format, { sourceUrl });
	if (renderedReport.trim().length === 0) return;
	return prComment({
		commentBody: renderedReport,
		footer,
		githubToken,
		issueNumber,
		owner,
		repo,
		searchPattern,
		title
	}, context, createClient);
}

//#endregion
//#region ../dx-tasks/dist/run-command.js
/** This module wraps child-process execution for dx-tasks Terraform commands. */
const runCommand = async (command, args, cwd, env) => {
	const { promise, reject, resolve } = Promise.withResolvers();
	const child = childProcess.spawn(command, args, {
		cwd,
		env: {
			...process.env,
			...env
		},
		stdio: [
			"inherit",
			"pipe",
			"pipe"
		]
	});
	let stderr = "";
	let stdout = "";
	child.stderr?.setEncoding("utf8");
	child.stderr?.on("data", (chunk) => {
		stderr += chunk;
	});
	child.stdout?.setEncoding("utf8");
	child.stdout?.on("data", (chunk) => {
		stdout += chunk;
	});
	child.on("error", reject);
	child.on("close", (exitCode, signal) => {
		if (signal) {
			resolve({
				exitCode: null,
				signal,
				stderr,
				stdout
			});
			return;
		}
		if (exitCode !== null) {
			resolve({
				exitCode,
				signal: null,
				stderr,
				stdout
			});
			return;
		}
		reject(/* @__PURE__ */ new Error(`${command} closed without an exit code or signal`));
	});
	return promise;
};

//#endregion
//#region ../dx-tasks/dist/terraform/mask-output.js
/** This module masks sensitive Terraform output before dx-tasks prints it. */
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const beginPemMarker = "-----BEGIN ";
const endPemMarker = "-----END ";
const pemDelimiter = "-----";
const maskPemBlocks = (input) => {
	const normalizedInput = input.toUpperCase();
	let masked = "";
	let cursor = 0;
	while (cursor < input.length) {
		const beginIndex = normalizedInput.indexOf(beginPemMarker, cursor);
		if (beginIndex === -1) return `${masked}${input.slice(cursor)}`;
		const beginTypeEnd = normalizedInput.indexOf(pemDelimiter, beginIndex + 11);
		if (beginTypeEnd === -1) return `${masked}${input.slice(cursor)}`;
		const endIndex = normalizedInput.indexOf(endPemMarker, beginTypeEnd + 5);
		if (endIndex === -1) return `${masked}${input.slice(cursor)}`;
		const endTypeEnd = normalizedInput.indexOf(pemDelimiter, endIndex + 9);
		if (endTypeEnd === -1) return `${masked}${input.slice(cursor)}`;
		masked += `${input.slice(cursor, beginIndex)}[REDACTED]`;
		cursor = endTypeEnd + 5;
	}
	return masked;
};
const maskOutput = (input, additionalKeys = []) => {
	const keys = additionalKeys.map((k) => k.trim()).filter((k) => k.length > 0);
	let masked = input;
	for (const key of keys) {
		const escapedKey = escapeRegExp(key);
		const diffRegex = new RegExp(`("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"(\\s*->\\s*)"[^"]*"`, "ig");
		masked = masked.replace(diffRegex, "$1\"[REDACTED]\"$2\"[REDACTED]\"");
		const normalRegex = new RegExp(`("?${escapedKey}[^"]*"?\\s*=\\s*)"[^"]*"`, "ig");
		masked = masked.replace(normalRegex, "$1\"[REDACTED]\"");
	}
	masked = maskPemBlocks(masked);
	const knownSecretsPattern = "(AccessKey|AccountKey|Password|secret|SecretToken|AuthToken|auth_token|access_key|apiKey|api_key|connection_string)";
	const hardcodedDiffRegex = new RegExp(`("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"(\\s*->\\s*)"([^"]{12,})"`, "ig");
	masked = masked.replace(hardcodedDiffRegex, "$1\"[REDACTED]\"$5\"[REDACTED]\"");
	const hardcodedNormalRegex = new RegExp(`("?[^"\\s]*${knownSecretsPattern}([^A-Za-z0-9]|$)"?\\s*[:=]\\s*)"([^"]{12,})"`, "ig");
	masked = masked.replace(hardcodedNormalRegex, "$1\"[REDACTED]\"");
	return masked;
};

//#endregion
//#region ../dx-tasks/dist/terraform/plan-file.js
/** This module defines the on-disk plan file name shared by the plan-upload and apply tasks. */
const PLAN_FILE_NAME = "tfplan.binary";

//#endregion
//#region ../dx-tasks/dist/terraform/plan-storage.js
/** This module stores Terraform plan bundles in the configured Terraform state backend. */
const nonEmptyStringSchema = z$1.string().check(z$1.minLength(1));
const execFileAsync = promisify(execFile);
const azurermBackendSchema = z$1.object({
	config: z$1.object({
		container_name: nonEmptyStringSchema,
		key: nonEmptyStringSchema,
		storage_account_name: nonEmptyStringSchema
	}),
	type: z$1.literal("azurerm")
});
const s3BackendSchema = z$1.object({
	config: z$1.object({
		bucket: nonEmptyStringSchema,
		key: nonEmptyStringSchema,
		region: nonEmptyStringSchema
	}),
	type: z$1.literal("s3")
});
const rawTerraformStateSchema = z$1.object({ backend: z$1.object({
	config: z$1.unknown(),
	type: nonEmptyStringSchema
}) });
const supportedBackendTypeSchema = z$1.union([z$1.literal("azurerm"), z$1.literal("s3")]);
const terraformStateSchema = z$1.object({ backend: z$1.discriminatedUnion("type", [azurermBackendSchema, s3BackendSchema]) });
const formatZodIssues = (error) => error.issues.map((issue) => issue.message).join("; ");
const getAbsoluteWorkingDirectory = (workingDirectory) => path.resolve(workingDirectory);
const getTerraformStatePath = (workingDirectory) => path.join(getAbsoluteWorkingDirectory(workingDirectory), ".terraform", "terraform.tfstate");
const getValidatedTerraformState = (content, terraformStatePath) => {
	const rawTerraformStateResult = rawTerraformStateSchema.safeParse(content);
	if (!rawTerraformStateResult.success) throw new Error(`Failed to validate Terraform backend state at "${terraformStatePath}": ${formatZodIssues(rawTerraformStateResult.error)}`);
	const backendType = rawTerraformStateResult.data.backend.type;
	if (!supportedBackendTypeSchema.safeParse(backendType).success) throw new Error(`Unsupported Terraform backend type "${backendType}" in "${terraformStatePath}"`);
	const terraformStateResult = terraformStateSchema.safeParse(content);
	if (!terraformStateResult.success) throw new Error(`Failed to validate Terraform backend state at "${terraformStatePath}": ${formatZodIssues(terraformStateResult.error)}`);
	return terraformStateResult.data;
};
const getBackendConfig = (terraformState) => {
	switch (terraformState.backend.type) {
		case "azurerm": return {
			container: terraformState.backend.config.container_name,
			key: terraformState.backend.config.key,
			storageAccount: terraformState.backend.config.storage_account_name,
			type: "azurerm"
		};
		case "s3": return {
			bucket: terraformState.backend.config.bucket,
			key: terraformState.backend.config.key,
			region: terraformState.backend.config.region,
			type: "s3"
		};
	}
};
const getPlanFileArchivePath = (workingDirectory, planFile) => {
	const absolutePlanFilePath = path.isAbsolute(planFile) ? path.resolve(planFile) : path.join(workingDirectory, planFile);
	const relativePlanFilePath = path.relative(workingDirectory, absolutePlanFilePath);
	if (relativePlanFilePath.length === 0 || relativePlanFilePath.startsWith("..") || path.isAbsolute(relativePlanFilePath)) throw new Error(`Plan file "${planFile}" must be located inside "${workingDirectory}"`);
	return relativePlanFilePath;
};
const createBundleEntries = (workingDirectory, planFile) => {
	const planFileArchivePath = getPlanFileArchivePath(workingDirectory, planFile);
	return [
		{
			absolutePath: path.join(workingDirectory, planFileArchivePath),
			archivePath: planFileArchivePath,
			optional: false
		},
		{
			absolutePath: path.join(workingDirectory, ".terraform.lock.hcl"),
			archivePath: ".terraform.lock.hcl",
			optional: true
		},
		{
			absolutePath: path.join(workingDirectory, ".terraform/modules"),
			archivePath: ".terraform/modules/",
			optional: true
		}
	];
};
const getExistingBundleEntries = async (entries) => {
	const existingEntries = [];
	for (const entry of entries) try {
		await fs.access(entry.absolutePath);
		existingEntries.push(entry.archivePath);
	} catch (cause) {
		if (entry.optional) {
			console.warn(`Skipping "${entry.archivePath}": not found at ${entry.absolutePath}`);
			continue;
		}
		throw new Error(`Required Terraform plan bundle entry "${entry.archivePath}" was not found at "${entry.absolutePath}"`, { cause });
	}
	return existingEntries;
};
const createBundle = async (workingDirectory, planFile) => {
	const bundleEntries = await getExistingBundleEntries(createBundleEntries(workingDirectory, planFile));
	const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-tasks-plan-storage-"));
	const archivePath = path.join(temporaryDirectory, "bundle.tar.gz");
	try {
		await execFileAsync("tar", [
			"czf",
			archivePath,
			"-C",
			workingDirectory,
			...bundleEntries
		]);
	} catch (cause) {
		await fs.rm(temporaryDirectory, {
			force: true,
			recursive: true
		});
		throw new Error(`Failed to create Terraform plan bundle for "${workingDirectory}"`, { cause });
	}
	return {
		archivePath,
		temporaryDirectory
	};
};
const createBlobServiceClient = (storageAccount) => new BlobServiceClient(`https://${storageAccount}.blob.core.windows.net`, new AzureCliCredential());
const uploadToAzure = async (backend, planPath, archivePath) => {
	await createBlobServiceClient(backend.storageAccount).getContainerClient(backend.container).getBlockBlobClient(planPath).uploadFile(archivePath);
};
const uploadToS3 = async (backend, planPath, archivePath) => {
	const client = new S3Client({ region: backend.region });
	const body = await fs.readFile(archivePath);
	await client.send(new PutObjectCommand({
		Body: body,
		Bucket: backend.bucket,
		Key: planPath
	}));
};
const uploadToBackend = async (backend, planPath, archivePath) => {
	switch (backend.type) {
		case "azurerm": return uploadToAzure(backend, planPath, archivePath);
		case "s3": return uploadToS3(backend, planPath, archivePath);
	}
};
const downloadFromAzure = async (backend, planPath, destinationPath) => {
	const archive = await createBlobServiceClient(backend.storageAccount).getContainerClient(backend.container).getBlobClient(planPath).downloadToBuffer();
	await fs.writeFile(destinationPath, archive, { mode: 384 });
};
const downloadFromS3 = async (backend, planPath, destinationPath) => {
	const response = await new S3Client({ region: backend.region }).send(new GetObjectCommand({
		Bucket: backend.bucket,
		Key: planPath
	}));
	if (!response.Body) throw new Error(`Received an empty response body for s3://${backend.bucket}/${planPath}`);
	await fs.writeFile(destinationPath, await response.Body.transformToByteArray(), { mode: 384 });
};
const downloadFromBackend = async (backend, planPath, destinationPath) => {
	switch (backend.type) {
		case "azurerm": return downloadFromAzure(backend, planPath, destinationPath);
		case "s3": return downloadFromS3(backend, planPath, destinationPath);
	}
};
const deleteFromAzure = async (backend, planPath) => {
	await createBlobServiceClient(backend.storageAccount).getContainerClient(backend.container).getBlobClient(planPath).deleteIfExists();
};
const deleteFromS3 = async (backend, planPath) => {
	await new S3Client({ region: backend.region }).send(new DeleteObjectCommand({
		Bucket: backend.bucket,
		Key: planPath
	}));
};
const readBackendConfig = async (workingDirectory) => {
	const terraformStatePath = getTerraformStatePath(workingDirectory);
	let rawTerraformState;
	try {
		rawTerraformState = await fs.readFile(terraformStatePath, "utf8");
	} catch (cause) {
		throw new Error(`Failed to read Terraform backend state from "${terraformStatePath}"`, { cause });
	}
	let parsedTerraformState;
	try {
		parsedTerraformState = JSON.parse(rawTerraformState);
	} catch (cause) {
		throw new Error(`Failed to parse Terraform backend state from "${terraformStatePath}" as JSON`, { cause });
	}
	return getBackendConfig(getValidatedTerraformState(parsedTerraformState, terraformStatePath));
};
const computePlanPath = (stateKey, runId) => {
	const stateDirectory = path.posix.dirname(stateKey);
	const stateBasename = path.posix.basename(stateKey);
	if (stateDirectory === ".") return `plan-artifacts/${stateBasename}.${runId}`;
	return `${stateDirectory}/plan-artifacts/${stateBasename}.${runId}`;
};
const uploadPlanBundle = async ({ planFile, runId, workingDirectory }) => {
	const absoluteWorkingDirectory = getAbsoluteWorkingDirectory(workingDirectory);
	const { key, ...backend } = await readBackendConfig(absoluteWorkingDirectory);
	const planPath = computePlanPath(key, runId);
	const { archivePath, temporaryDirectory } = await createBundle(absoluteWorkingDirectory, planFile);
	try {
		await uploadToBackend(backend, planPath, archivePath);
	} finally {
		await fs.rm(temporaryDirectory, {
			force: true,
			recursive: true
		});
	}
	return {
		backend,
		planPath
	};
};
const downloadPlanBundle = async ({ backend, planPath, workingDirectory }) => {
	const absoluteWorkingDirectory = getAbsoluteWorkingDirectory(workingDirectory);
	const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "dx-tasks-plan-storage-"));
	const archivePath = path.join(temporaryDirectory, "bundle.tar.gz");
	try {
		await downloadFromBackend(backend, planPath, archivePath);
		await fs.mkdir(absoluteWorkingDirectory, { recursive: true });
		await execFileAsync("tar", [
			"xzf",
			archivePath,
			"-C",
			absoluteWorkingDirectory,
			"--no-same-owner",
			"--no-same-permissions"
		]);
	} finally {
		await fs.rm(temporaryDirectory, {
			force: true,
			recursive: true
		});
	}
};
const deleteRemotePlanBundle = async ({ backend, planPath }) => {
	switch (backend.type) {
		case "azurerm": return deleteFromAzure(backend, planPath);
		case "s3": return deleteFromS3(backend, planPath);
	}
};

//#endregion
//#region ../dx-tasks/dist/terraform/apply.js
/** This module downloads and applies a previously generated Terraform plan bundle. */
const TERRAFORM_APPLY_NAMESPACE = "terraform-apply";
const terraformApplyPayloadShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	report: z$1._default(z$1.boolean(), false),
	sensitiveKeys: z$1._default(z$1.array(z$1.string().check(z$1.minLength(1))), []),
	verbose: z$1._default(z$1.boolean(), false)
};
const payloadSchema$2 = z$1.object(terraformApplyPayloadShape);
const terraformApplyReportShape = {
	applyOutput: z$1.string(),
	modulePath: z$1.string().check(z$1.minLength(1)),
	notices: z$1.array(z$1.object({
		message: z$1.string().check(z$1.minLength(1)),
		severity: z$1.union([z$1.literal("warning"), z$1.literal("error")])
	})),
	success: z$1._default(z$1.boolean(), true),
	summaryLine: z$1.optional(z$1.string().check(z$1.minLength(1)))
};
const terraformApplyReportSchema = z$1.object(terraformApplyReportShape);
const noApplyOutputMessage = "No apply output available.";
const terraformApplyReportSeparator = "\n\n";
const renderNoticeMarkdown$1 = ({ message, severity }) => {
	return `> [!${severity === "warning" ? "WARNING" : "CAUTION"}]\n${message.split("\n").map((line) => `> ${line}`).join("\n")}`;
};
const renderTerraformApplyReport = ({ applyOutput, modulePath, notices, success, summaryLine }, { sourceUrl }) => {
	const heading = `### Terraform Apply: \`${modulePath}\` - ${success ? "✅ Success" : "❌ Failed"}`;
	const renderedNotices = notices.map(renderNoticeMarkdown$1);
	const details = `> [!NOTE]\n> Full apply output is not included in this comment.\n> ${sourceUrl ? `See the [workflow run](${sourceUrl}) logs for the complete output.` : "See the workflow run logs for the complete output."}`;
	if (renderedNotices.length > 0) return `${heading}\n${renderedNotices.join("\n\n")}${summaryLine ? `\n\n${summaryLine}` : ""}\n\n${details}`;
	return `${heading}${summaryLine ? `\n${summaryLine}` : ""}\n\n${details}`;
};
const renderTerraformApplyReports = (reports, { sourceUrl } = {}) => reports.map((report) => renderTerraformApplyReport(report, { sourceUrl })).join(terraformApplyReportSeparator).trim();
const terraformApplyReportNamespace = {
	name: TERRAFORM_APPLY_NAMESPACE,
	renderers: { markdown: renderTerraformApplyReports },
	schema: terraformApplyReportSchema
};
const isRunningInCI$1 = () => {
	const ci = process.env.CI;
	return Boolean(ci) && ci !== "false" && ci !== "0";
};
const getMaskedOutputOrFallback$1 = (maskedOutput) => maskedOutput.trim().length > 0 ? maskedOutput : noApplyOutputMessage;
const getApplyOutput = (maskedOutput, verbose) => {
	if (verbose) return getMaskedOutputOrFallback$1(maskedOutput);
	return maskedOutput.match(/(?:^.*Error:[\s\S]*|^.*Apply complete!.*)/m)?.[0] ?? getMaskedOutputOrFallback$1(maskedOutput);
};
const getApplySummaryLine = (maskedOutput) => util.stripVTControlCharacters(maskedOutput).match(/^Apply complete!.*$/m)?.[0];
const noticeStartPattern$1 = /^(?:│\s*)?(Warning|Error):/;
const getNoticeSeverity$1 = (line) => {
	const [, severity] = noticeStartPattern$1.exec(line) ?? [];
	if (severity === "Warning") return "warning";
	if (severity === "Error") return "error";
};
const isApplySectionStart = (line) => /^(?:Apply complete!|[\w."[\]-]+: (?:Creating|Modifying|Destroying|Refreshing state|Creation complete|Modifications complete|Destruction complete)\b)/.test(line);
const normalizeNoticeLine$1 = (line) => line.replace(/^│ ?/, "");
const getApplyNotices = (maskedOutput) => {
	const lines = util.stripVTControlCharacters(maskedOutput).split(/\r?\n/);
	const notices = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const severity = getNoticeSeverity$1(lines[lineIndex] ?? "");
		if (!severity) continue;
		const messageLines = [];
		for (let noticeLineIndex = lineIndex; noticeLineIndex < lines.length; noticeLineIndex += 1) {
			const line = lines[noticeLineIndex] ?? "";
			const isFirstLine = noticeLineIndex === lineIndex;
			if (!isFirstLine && getNoticeSeverity$1(line)) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			if (!isFirstLine && (line === "╵" || isApplySectionStart(line))) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			messageLines.push(normalizeNoticeLine$1(line));
			lineIndex = noticeLineIndex;
		}
		const message = messageLines.join("\n").trim();
		if (message.length > 0) notices.push({
			message,
			severity
		});
	}
	return notices;
};
const getFailureMessage$1 = (result) => {
	if (result.signal) return `Terraform apply terminated by signal ${result.signal}`;
	if (result.exitCode !== 0) return `Terraform apply exited with code ${result.exitCode}`;
	return noApplyOutputMessage;
};
const getRunId$1 = () => {
	const runId = process.env.GITHUB_RUN_ID;
	if (!runId) throw new Error("GITHUB_RUN_ID environment variable is required to locate the Terraform plan bundle to apply");
	return runId;
};
const executeTerraformApply = async (modulePath, verbose, report, sensitiveKeys, context) => {
	const env = {};
	if (!verbose) env.TF_IN_AUTOMATION = "true";
	if (isRunningInCI$1()) env.TF_IN_AUTOMATION = "true";
	const result = await runCommand("terraform", [
		"apply",
		"-lock-timeout=120s",
		"-input=false",
		"-no-color",
		"-auto-approve",
		PLAN_FILE_NAME
	], modulePath, env);
	if (result.signal) throw new Error(getFailureMessage$1(result));
	const maskedOutput = maskOutput([result.stdout, result.stderr].filter((output) => output.trim().length > 0).join("\n"), [...sensitiveKeys]);
	const applyOutput = getApplyOutput(maskedOutput, verbose);
	const notices = getApplyNotices(maskedOutput);
	const summaryLine = getApplySummaryLine(maskedOutput);
	console.log(applyOutput);
	if (report && context.reports) await context.reports.write(TERRAFORM_APPLY_NAMESPACE, Buffer.from(modulePath).toString("base64url"), {
		applyOutput: util.stripVTControlCharacters(applyOutput),
		modulePath,
		notices,
		success: result.exitCode === 0,
		...summaryLine ? { summaryLine } : {}
	});
	if (result.exitCode !== 0) throw new Error(getFailureMessage$1(result));
};
async function terraformApply({ modulePath, report = false, sensitiveKeys = [], verbose = false }, context = {}) {
	const runId = getRunId$1();
	const { key, ...backend } = await readBackendConfig(modulePath);
	const planPath = computePlanPath(key, runId);
	await downloadPlanBundle({
		backend,
		planPath,
		workingDirectory: modulePath
	});
	await executeTerraformApply(modulePath, verbose, report, sensitiveKeys, context);
	await deleteRemotePlanBundle({
		backend,
		planPath
	});
}

//#endregion
//#region ../dx-tasks/dist/terraform/plan.js
/** This module runs Terraform plans for dx-tasks without external process helpers. */
const TERRAFORM_PLAN_NAMESPACE = "terraform-plan";
const terraformPlanPayloadShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	out: z$1.optional(z$1.string().check(z$1.minLength(1))),
	refresh: z$1._default(z$1.boolean(), true),
	report: z$1._default(z$1.boolean(), false),
	sensitiveKeys: z$1._default(z$1.array(z$1.string().check(z$1.minLength(1))), []),
	verbose: z$1._default(z$1.boolean(), false)
};
const payloadSchema$1 = z$1.object(terraformPlanPayloadShape);
const terraformPlanReportShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	notices: z$1.array(z$1.object({
		message: z$1.string().check(z$1.minLength(1)),
		severity: z$1.union([z$1.literal("warning"), z$1.literal("error")])
	})),
	planOutput: z$1.string(),
	success: z$1._default(z$1.boolean(), true),
	summaryLine: z$1.optional(z$1.string().check(z$1.minLength(1)))
};
const terraformPlanReportSchema = z$1.object(terraformPlanReportShape);
const noPlanOutputMessage = "No plan output available.";
const terraformPlanReportSeparator = "\n\n";
const renderTerraformPlanReports = (reports, { sourceUrl } = {}) => reports.map((report) => renderTerraformPlanReport(report, { sourceUrl })).join(terraformPlanReportSeparator).trim();
const renderPlanOutputReference = (sourceUrl) => {
	return `> [!NOTE]\n> Full plan output is not included in this comment.\n> ${sourceUrl ? `See the [workflow run](${sourceUrl}) logs or downloaded Terraform plan report artifacts for the complete output.` : "See the workflow run logs or downloaded Terraform plan report artifacts for the complete output."}`;
};
const renderTerraformPlanReport = ({ modulePath, notices, success, summaryLine }, { sourceUrl }) => {
	const heading = `### Terraform Plan: \`${modulePath}\` - ${success ? "✅ Success" : "❌ Failed"}`;
	const renderedNotices = notices.map(renderNoticeMarkdown);
	const details = renderPlanOutputReference(sourceUrl);
	if (renderedNotices.length > 0) return `${heading}\n${renderedNotices.join("\n\n")}${summaryLine ? `\n\n${summaryLine}` : ""}\n\n${details}`;
	return `${heading}${summaryLine ? `\n${summaryLine}` : ""}\n\n${details}`;
};
const terraformPlanReportNamespace = {
	name: TERRAFORM_PLAN_NAMESPACE,
	renderers: { markdown: renderTerraformPlanReports },
	schema: terraformPlanReportSchema
};
const isRunningInCI = () => {
	const ci = process.env.CI;
	return Boolean(ci) && ci !== "false" && ci !== "0";
};
const getMaskedOutputOrFallback = (maskedOutput) => maskedOutput.trim().length > 0 ? maskedOutput : noPlanOutputMessage;
const getPlanOutput = (maskedOutput, verbose) => {
	if (verbose) return getMaskedOutputOrFallback(maskedOutput);
	return maskedOutput.match(/(?:^.*Terraform will perform the following actions:[\s\S]*|^.*Terraform planned the following actions, but then encountered a problem:[\s\S]*|^.*No changes\..*)/m)?.[0] ?? getMaskedOutputOrFallback(maskedOutput);
};
const getPlanSummaryLine = (maskedOutput) => util.stripVTControlCharacters(maskedOutput).match(/^Plan:\s+.+$/m)?.[0];
const noticeStartPattern = /^(?:│\s*)?(Warning|Error):/;
const getNoticeSeverity = (line) => {
	const [, severity] = noticeStartPattern.exec(line) ?? [];
	if (severity === "Warning") return "warning";
	if (severity === "Error") return "error";
};
const isPlanSectionStart = (line) => /^(?:Terraform used the selected providers|Terraform will perform the following actions:|Terraform planned the following actions, but then encountered a problem:|No changes\.|Plan:\s+)/.test(line);
const normalizeNoticeLine = (line) => line.replace(/^│ ?/, "");
const getPlanNotices = (maskedOutput) => {
	const lines = util.stripVTControlCharacters(maskedOutput).split(/\r?\n/);
	const notices = [];
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const severity = getNoticeSeverity(lines[lineIndex] ?? "");
		if (!severity) continue;
		const messageLines = [];
		for (let noticeLineIndex = lineIndex; noticeLineIndex < lines.length; noticeLineIndex += 1) {
			const line = lines[noticeLineIndex] ?? "";
			const isFirstLine = noticeLineIndex === lineIndex;
			if (!isFirstLine && getNoticeSeverity(line)) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			if (!isFirstLine && (line === "╵" || isPlanSectionStart(line))) {
				lineIndex = noticeLineIndex - 1;
				break;
			}
			messageLines.push(normalizeNoticeLine(line));
			lineIndex = noticeLineIndex;
		}
		const message = messageLines.join("\n").trim();
		if (message.length > 0) notices.push({
			message,
			severity
		});
	}
	return notices;
};
const renderNoticeMarkdown = ({ message, severity }) => {
	return `> [!${severity === "warning" ? "WARNING" : "CAUTION"}]\n${message.split("\n").map((line) => `> ${line}`).join("\n")}`;
};
const getFailureMessage = (result) => {
	if (result.signal) return `Terraform plan terminated by signal ${result.signal}`;
	if (result.exitCode !== 0) return `Terraform plan exited with code ${result.exitCode}`;
	return noPlanOutputMessage;
};
const executeTerraformPlan = async (modulePath, env, verbose, report, sensitiveKeys, context) => {
	const result = await runCommand("terraform", ["plan"], modulePath, env);
	if (result.signal) throw new Error(getFailureMessage(result));
	const maskedOutput = maskOutput([result.stdout, result.stderr].filter((output) => output.trim().length > 0).join("\n"), [...sensitiveKeys]);
	const planOutput = getPlanOutput(maskedOutput, verbose);
	const notices = getPlanNotices(maskedOutput);
	const summaryLine = getPlanSummaryLine(maskedOutput);
	console.log(planOutput);
	if (report && context.reports) await context.reports.write(TERRAFORM_PLAN_NAMESPACE, Buffer.from(modulePath).toString("base64url"), {
		modulePath,
		notices,
		planOutput: util.stripVTControlCharacters(planOutput),
		success: result.exitCode === 0,
		...summaryLine ? { summaryLine } : {}
	});
	if (result.exitCode !== 0) throw new Error(getFailureMessage(result));
};
async function terraformPlan({ modulePath, out, refresh = true, report = false, sensitiveKeys = [], verbose = false }, context = {}) {
	const args = /* @__PURE__ */ new Map();
	const env = {};
	args.set("lock-timeout", "120s");
	if (out) args.set("out", out);
	if (!refresh) {
		args.set("refresh", "false");
		args.set("lock", "false");
	}
	if (!verbose) env.TF_IN_AUTOMATION = "true";
	if (isRunningInCI()) {
		args.set("input", "false");
		args.set("no-color", true);
		env.TF_IN_AUTOMATION = "true";
	}
	env.TF_CLI_ARGS_plan = args.entries().reduce((acc, [key, value]) => `${acc}-${key}${value === true ? "" : `=${value}`} `, "");
	await executeTerraformPlan(modulePath, env, verbose, report, sensitiveKeys, context);
}

//#endregion
//#region ../dx-tasks/dist/terraform/plan-upload.js
/** This module runs a Terraform plan and uploads the resulting bundle for a later apply. */
const terraformPlanUploadPayloadShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	refresh: z$1._default(z$1.boolean(), true),
	report: z$1._default(z$1.boolean(), false),
	sensitiveKeys: z$1._default(z$1.array(z$1.string().check(z$1.minLength(1))), []),
	verbose: z$1._default(z$1.boolean(), false)
};
const payloadSchema = z$1.object(terraformPlanUploadPayloadShape);
const getRunId = () => {
	const runId = process.env.GITHUB_RUN_ID;
	if (!runId) throw new Error("GITHUB_RUN_ID environment variable is required to upload a Terraform plan bundle");
	return runId;
};
async function terraformPlanUpload({ modulePath, refresh = true, report = false, sensitiveKeys = [], verbose = false }, context = {}) {
	await terraformPlan({
		modulePath,
		out: PLAN_FILE_NAME,
		refresh,
		report,
		sensitiveKeys,
		verbose
	}, context);
	const { backend, planPath } = await uploadPlanBundle({
		planFile: PLAN_FILE_NAME,
		runId: getRunId(),
		workingDirectory: modulePath
	});
	console.log(`Uploaded Terraform plan bundle for "${modulePath}" (${backend.type}) to "${planPath}"`);
}

//#endregion
//#region ../dx-tasks/dist/tasks.js
/** This module exposes built-in dx-tasks task definitions for external registries. */
const terraformPlanTask = {
	name: "terraformPlan",
	payloadSchema: payloadSchema$1,
	run: terraformPlan
};
const terraformPlanUploadTask = {
	name: "terraformPlanUpload",
	payloadSchema,
	run: terraformPlanUpload
};
const terraformApplyTask = {
	name: "terraformApply",
	payloadSchema: payloadSchema$2,
	run: terraformApply
};
const renderReportTask = {
	name: "renderReport",
	payloadSchema: payloadSchema$4,
	run: renderReport
};
const reportPrCommentTask = {
	name: "reportPrComment",
	payloadSchema: payloadSchema$3,
	run: reportPrComment
};
const prCommentTask = {
	name: "prComment",
	payloadSchema: payloadSchema$6,
	run: prComment
};
const validateTerraformEnvironmentReleaseTask = {
	name: "validateTerraformEnvironmentRelease",
	payloadSchema: payloadSchema$5,
	run: validateTerraformEnvironmentRelease
};

//#endregion
//#region ../dx-tasks/dist/default-dispatcher.js
/** This module wires the default dx-tasks registry with built-in task definitions. */
const createDefaultReportStore = () => new ReportStore(process.cwd()).register(terraformPlanReportNamespace).register(terraformApplyReportNamespace);
const createDefaultTaskDispatcher = ({ githubToken, reports = createDefaultReportStore() } = {}) => {
	const dispatcher = createTaskDispatcher({ context: {
		githubToken,
		reports
	} });
	dispatcher.registerTask(terraformPlanTask);
	dispatcher.registerTask(terraformPlanUploadTask);
	dispatcher.registerTask(terraformApplyTask);
	dispatcher.registerTask(renderReportTask);
	dispatcher.registerTask(reportPrCommentTask);
	dispatcher.registerTask(prCommentTask);
	dispatcher.registerTask(validateTerraformEnvironmentReleaseTask);
	return dispatcher;
};

//#endregion
export { createDefaultTaskDispatcher as t };