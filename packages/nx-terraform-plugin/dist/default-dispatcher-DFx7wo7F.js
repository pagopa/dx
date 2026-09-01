import fs from "node:fs/promises";
import path from "node:path";
import * as z$1 from "zod/mini";
import { Octokit } from "octokit";
import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { z } from "zod/v4";
import util from "node:util";

//#region ../dx-tasks/src/dispatcher.ts
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
//#region ../dx-tasks/src/report-store.ts
/** This module stores and renders dx-tasks reports under a per-namespace directory tree. */
const nonEmptyStringSchema$2 = z$1.string().check(z$1.minLength(1));
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
		const name = nonEmptyStringSchema$2.parse(namespace.name);
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
		const name = nonEmptyStringSchema$2.parse(namespaceName);
		const namespace = this.namespaces.get(name);
		if (!namespace) throw new Error(`Report namespace "${name}" is not registered`);
		const report = namespace.schema.parse(content);
		const directoryPath = path.join(this.rootDirectoryPath, name);
		const filePath = path.join(directoryPath, `${nonEmptyStringSchema$2.parse(objectName)}.json`);
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
//#region ../dx-tasks/src/github/pr-comment.ts
/** This module creates GitHub PR comments as a reusable dx-tasks task. */
const nonEmptyStringSchema$1 = z$1.string().check(z$1.minLength(1));
const prCommentPayloadShape = {
	commentBody: nonEmptyStringSchema$1,
	footer: z$1.optional(nonEmptyStringSchema$1),
	githubToken: z$1.optional(nonEmptyStringSchema$1),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema$1,
	repo: nonEmptyStringSchema$1,
	searchPattern: z$1.optional(nonEmptyStringSchema$1),
	title: z$1.optional(nonEmptyStringSchema$1)
};
const payloadSchema$4 = z$1.object(prCommentPayloadShape);
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
//#region ../dx-tasks/src/render-report.ts
/** This module renders persisted dx-tasks reports and prints them to stdout. */
const renderReportPayloadShape = { format: z$1._default(z$1.literal("markdown"), "markdown") };
const payloadSchema$3 = z$1.object(renderReportPayloadShape);
async function renderReport({ format = "markdown" }, context = {}) {
	if (!context.reports) throw new Error("renderReport requires reports in the task context");
	const renderedReport = await context.reports.render(format);
	console.log(renderedReport);
}

//#endregion
//#region ../dx-tasks/src/report-pr-comment.ts
/** This module renders persisted dx-tasks reports and posts them as GitHub PR comments. */
const nonEmptyStringSchema = z$1.string().check(z$1.minLength(1));
const reportPrCommentPayloadShape = {
	footer: z$1.optional(nonEmptyStringSchema),
	format: z$1._default(z$1.literal("markdown"), "markdown"),
	githubToken: z$1.optional(nonEmptyStringSchema),
	issueNumber: z$1.number().check(z$1.int(), z$1.positive()),
	owner: nonEmptyStringSchema,
	repo: nonEmptyStringSchema,
	searchPattern: z$1.optional(nonEmptyStringSchema),
	sourceUrl: z$1.optional(nonEmptyStringSchema),
	title: z$1.optional(nonEmptyStringSchema)
};
const payloadSchema$2 = z$1.object(reportPrCommentPayloadShape);
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
//#region ../dx-tasks/src/run-command.ts
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
//#region ../dx-tasks/src/terraform/module-lock.ts
/**
* Builds and persists deterministic Terraform Registry module locks for tasks.
*/
const lockFileName = "tfmodules.lock.json";
const registryPrefix = "registry.terraform.io/";
const metadataModuleSchema = z.object({
	Key: z.string(),
	Source: z.string(),
	Version: z.string().optional()
});
const modulesMetadataSchema = z.object({ Modules: z.array(metadataModuleSchema) });
const lockEntrySchema = z.object({
	hash: z.string(),
	source: z.string()
}).strict();
const moduleLockSchema = z.record(z.string(), lockEntrySchema);
const moduleLockFileVersion = 2;
const moduleLockFileSchema = z.object({
	lockFileVersion: z.literal(moduleLockFileVersion),
	modules: moduleLockSchema
}).strict();
const legacyLockEntrySchema = z.union([z.string(), z.object({
	hash: z.string(),
	source: z.string()
}).loose()]);
const legacyModuleLockSchema = z.record(z.string(), legacyLockEntrySchema);
const readableModuleLockSchema = z.union([moduleLockFileSchema.transform(({ modules }) => ({
	formatVersion: moduleLockFileVersion,
	modules
})), legacyModuleLockSchema.transform((modules) => ({
	formatVersion: 1,
	modules
}))]);
const hash = (content) => createHash("sha256").update(content).digest("hex");
const isFileNotFoundError = (error) => typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
const parseAndValidateJson = (content, filePath, schema) => {
	try {
		return schema.parse(JSON.parse(content));
	} catch (error) {
		if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${filePath}`, { cause: error });
		if (error instanceof z.ZodError) throw new Error(`Invalid data in ${filePath}: ${z.prettifyError(error)}`, { cause: error });
		throw error;
	}
};
const listModuleFiles = async (modulePath, relativePath = "") => {
	const directoryPath = path.join(modulePath, relativePath);
	const entries = await fs.readdir(directoryPath, { withFileTypes: true });
	const visibleEntries = relativePath === "" ? entries.filter((entry) => !entry.name.startsWith(".")) : entries;
	return (await Promise.all(visibleEntries.map(async (entry) => {
		const entryRelativePath = path.join(relativePath, entry.name);
		if (entry.isDirectory()) return listModuleFiles(modulePath, entryRelativePath);
		return entry.isFile() ? [path.join(modulePath, entryRelativePath)] : [];
	}))).flat().sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));
};
const calculateModuleHash = async (modulePath) => {
	const filePaths = await listModuleFiles(modulePath);
	const fileHashes = [];
	for (const filePath of filePaths) fileHashes.push(hash(await fs.readFile(filePath)));
	const hashes = fileHashes.length > 0 ? fileHashes : [hash(Buffer.from(""))];
	return hash(hashes.map((fileHash) => `${fileHash}\n`).join(""));
};
const getRegistryModuleSource = (source, registryVersion) => `https://registry.terraform.io/modules/${source.slice(22)}/${registryVersion ?? "latest"}`;
const getRegistryModules = async (projectRoot) => {
	const metadataPath = path.join(projectRoot, ".terraform", "modules", "modules.json");
	let metadata;
	try {
		const content = await fs.readFile(metadataPath, "utf8");
		metadata = parseAndValidateJson(content, metadataPath, modulesMetadataSchema);
	} catch (error) {
		if (!isFileNotFoundError(error)) throw error;
	}
	return (metadata?.Modules ?? []).filter((module) => module.Key !== "" && module.Source.startsWith(registryPrefix));
};
const generateModuleLockEntry = async (modulesRoot, module) => {
	const modulePath = path.resolve(modulesRoot, module.Key);
	if (!modulePath.startsWith(`${modulesRoot}${path.sep}`)) throw new Error(`Invalid Terraform module key outside the module cache: ${module.Key}`);
	const hash = await calculateModuleHash(modulePath);
	const source = getRegistryModuleSource(module.Source, module.Version);
	return [module.Key, {
		hash,
		source
	}];
};
const generateModuleLock = async (projectRoot) => {
	const registryModules = await getRegistryModules(projectRoot);
	const modulesRoot = path.resolve(projectRoot, ".terraform", "modules");
	const entries = await Promise.all(registryModules.map((module) => generateModuleLockEntry(modulesRoot, module)));
	return Object.fromEntries(entries);
};
const serializeModuleLock = (lock) => `${JSON.stringify({
	lockFileVersion: moduleLockFileVersion,
	modules: lock
}, void 0, 2)}\n`;
const readCurrentModuleLock = async (lockPath) => {
	try {
		const content = await fs.readFile(lockPath, "utf8");
		return parseAndValidateJson(content, lockPath, readableModuleLockSchema);
	} catch (error) {
		if (isFileNotFoundError(error)) return {
			formatVersion: moduleLockFileVersion,
			modules: {}
		};
		throw error;
	}
};
const compareModuleKeys = (left, right) => Buffer.from(left).compare(Buffer.from(right));
const getEntryHash = (entry) => typeof entry === "string" ? entry : entry?.hash;
const getModuleLockChanges = (currentLock, generatedLock) => {
	return Array.from(/* @__PURE__ */ new Set([...Object.keys(currentLock), ...Object.keys(generatedLock)])).sort(compareModuleKeys).flatMap((key) => {
		if (!Object.hasOwn(currentLock, key)) return [{
			key,
			status: "added"
		}];
		if (!Object.hasOwn(generatedLock, key)) return [{
			key,
			status: "removed"
		}];
		const currentEntry = currentLock[key];
		const generatedEntry = generatedLock[key];
		if (getEntryHash(currentEntry) !== generatedEntry.hash) return [{
			key,
			status: "changed"
		}];
		return [];
	});
};
const preserveLockOrder = (currentLock, generatedLock, preserveEntries) => {
	const currentKeys = Object.keys(currentLock).filter((key) => Object.hasOwn(generatedLock, key));
	const newKeys = Object.keys(generatedLock).filter((key) => !Object.hasOwn(currentLock, key)).sort(compareModuleKeys);
	return Object.fromEntries([...currentKeys, ...newKeys].map((key) => {
		const generatedEntry = generatedLock[key];
		const currentEntry = Object.hasOwn(currentLock, key) ? currentLock[key] : void 0;
		return [key, preserveEntries && typeof currentEntry !== "string" && currentEntry?.hash === generatedEntry.hash ? {
			hash: currentEntry.hash,
			source: currentEntry.source
		} : generatedEntry];
	}));
};
const compareModuleLock = async (projectRoot) => {
	const lockPath = path.join(projectRoot, lockFileName);
	const [generatedLock, currentLock] = await Promise.all([generateModuleLock(projectRoot), readCurrentModuleLock(lockPath)]);
	const orderedLock = preserveLockOrder(currentLock.modules, generatedLock, currentLock.formatVersion === moduleLockFileVersion);
	const content = serializeModuleLock(orderedLock);
	const changes = getModuleLockChanges(currentLock.modules, generatedLock);
	return {
		changes,
		content,
		formatVersion: currentLock.formatVersion,
		isDifferent: currentLock.formatVersion !== moduleLockFileVersion || changes.length > 0,
		path: lockPath
	};
};

//#endregion
//#region ../dx-tasks/src/terraform/init.ts
/** This module initializes Terraform and enforces Registry module locks. */
const incompatibleGetArgumentError = "The -get=false option is incompatible with Terraform module locking";
const isTerraformFalse = (value) => /^(?:0|f(?:alse)?)$/i.test(value);
const disablesModuleDownloads = (args) => args.some((argument, index) => {
	const inlineValue = /^--?get=(.+)$/i.exec(argument)?.[1];
	return inlineValue !== void 0 && isTerraformFalse(inlineValue) || /^--?get$/i.test(argument) && args[index + 1] !== void 0 && isTerraformFalse(args[index + 1]);
});
const terraformInitPayloadShape = {
	args: z$1._default(z$1.array(z$1.string()).check(z$1.refine((args) => !disablesModuleDownloads(args), incompatibleGetArgumentError)), []),
	frozenLockfile: z$1._default(z$1.boolean(), false),
	modulePath: z$1.string().check(z$1.minLength(1))
};
const payloadSchema$1 = z$1.object(terraformInitPayloadShape);
const printTerraformOutput = (result) => {
	if (result.stdout.length > 0) console.log(result.stdout);
	if (result.stderr.length > 0) console.error(result.stderr);
};
const getInitFailureMessage = (result) => {
	const termination = result.signal === null ? `exit code ${result.exitCode}` : `signal ${result.signal}`;
	const details = [result.stderr.trim(), result.stdout.trim()].filter((output) => output.length > 0).join("\n");
	return `terraform init failed with ${termination}${details ? `\n${details}` : ""}`;
};
const getLockChangeSummary = (changes, formatVersion) => formatVersion === 1 ? "legacy module lock format (version 1)" : changes.length > 0 ? changes.map(({ key, status }) => `${status}: ${key}`).join(", ") : "no module hash changes";
async function terraformInit({ args = [], frozenLockfile = false, modulePath }) {
	if (disablesModuleDownloads(args)) throw new Error(incompatibleGetArgumentError);
	const result = await runCommand("terraform", [
		"init",
		...args,
		"-get=true"
	], modulePath, {});
	printTerraformOutput(result);
	if (result.exitCode !== 0) throw new Error(getInitFailureMessage(result));
	const comparison = await compareModuleLock(modulePath);
	if (frozenLockfile && comparison.isDifferent) {
		const summary = getLockChangeSummary(comparison.changes, comparison.formatVersion);
		throw new Error(`Terraform module lock is frozen and out of date at ${comparison.path}: ${summary}`);
	}
	if (frozenLockfile) return;
	if (comparison.isDifferent) {
		const temporaryDirectory = await fs.mkdtemp(path.join(path.dirname(comparison.path), ".tfmodules-lock-"));
		const temporaryPath = path.join(temporaryDirectory, "tfmodules.lock.json");
		try {
			await fs.writeFile(temporaryPath, comparison.content, {
				encoding: "utf8",
				flag: "wx"
			});
			await fs.rename(temporaryPath, comparison.path);
		} finally {
			await fs.rm(temporaryDirectory, {
				force: true,
				recursive: true
			});
		}
		console.log(`Updated Terraform module lock at ${comparison.path}`);
	}
}

//#endregion
//#region ../dx-tasks/src/terraform/mask-output.ts
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
//#region ../dx-tasks/src/terraform/plan.ts
/** This module runs Terraform plans for dx-tasks without external process helpers. */
const TERRAFORM_PLAN_NAMESPACE = "terraform-plan";
const terraformPlanPayloadShape = {
	modulePath: z$1.string().check(z$1.minLength(1)),
	out: z$1.optional(z$1.string().check(z$1.minLength(1))),
	refresh: z$1._default(z$1.boolean(), true),
	report: z$1._default(z$1.boolean(), false),
	verbose: z$1._default(z$1.boolean(), false)
};
const payloadSchema = z$1.object(terraformPlanPayloadShape);
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
const executeTerraformPlan = async (modulePath, env, verbose, report, context) => {
	const result = await runCommand("terraform", ["plan"], modulePath, env);
	if (result.signal) throw new Error(getFailureMessage(result));
	const maskedOutput = maskOutput([result.stdout, result.stderr].filter((output) => output.trim().length > 0).join("\n"));
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
async function terraformPlan({ modulePath, out, refresh = true, report = false, verbose = false }, context = {}) {
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
	await executeTerraformPlan(modulePath, env, verbose, report, context);
}

//#endregion
//#region ../dx-tasks/src/tasks.ts
const terraformInitTask = {
	name: "terraformInit",
	payloadSchema: payloadSchema$1,
	run: terraformInit
};
const terraformPlanTask = {
	name: "terraformPlan",
	payloadSchema,
	run: terraformPlan
};
const renderReportTask = {
	name: "renderReport",
	payloadSchema: payloadSchema$3,
	run: renderReport
};
const reportPrCommentTask = {
	name: "reportPrComment",
	payloadSchema: payloadSchema$2,
	run: reportPrComment
};
const prCommentTask = {
	name: "prComment",
	payloadSchema: payloadSchema$4,
	run: prComment
};

//#endregion
//#region ../dx-tasks/src/default-dispatcher.ts
/** This module wires the default dx-tasks registry with built-in task definitions. */
const createDefaultReportStore = () => new ReportStore(process.cwd()).register(terraformPlanReportNamespace);
const createDefaultTaskDispatcher = ({ reports = createDefaultReportStore() } = {}) => {
	const dispatcher = createTaskDispatcher({ context: { reports } });
	dispatcher.registerTask(terraformInitTask);
	dispatcher.registerTask(terraformPlanTask);
	dispatcher.registerTask(renderReportTask);
	dispatcher.registerTask(reportPrCommentTask);
	dispatcher.registerTask(prCommentTask);
	return dispatcher;
};

//#endregion
export { createDefaultTaskDispatcher as t };