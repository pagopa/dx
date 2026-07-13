import * as semver from "semver";
import { stringFormat, z } from "zod/v4";

//#region src/publish-options.ts
const semverSchema = stringFormat("semver", (value) => {
	if (typeof value !== "string") return true;
	if (!value || value.startsWith("v")) return false;
	return semver.valid(value) !== null;
}, "Invalid semver version");
const publishSchema = z.object({
	description: z.string().min(1),
	github: z.object({ owner: z.string().min(1) }),
	provider: z.string().min(1),
	version: semverSchema
});
var PublishOptionsError = class extends Error {
	issues;
	constructor(issues) {
		super("Invalid publish options");
		this.issues = issues;
		this.name = "PublishOptionsError";
	}
};
const pluginPublishOptionsSchema = publishSchema.pick({ github: true }).extend({ github: z.object({ owner: z.string().min(1).optional() }).optional() });
const mergePublishOptions = (pluginPublishOptions, manifest) => {
	const parseResult = publishSchema.safeParse({
		...pluginPublishOptions,
		...manifest,
		github: {
			...pluginPublishOptions.github,
			...manifest.github
		}
	});
	if (!parseResult.success) throw new PublishOptionsError(parseResult.error.issues);
	return parseResult.data;
};

//#endregion
export { publishSchema as i, mergePublishOptions as n, pluginPublishOptionsSchema as r, PublishOptionsError as t };