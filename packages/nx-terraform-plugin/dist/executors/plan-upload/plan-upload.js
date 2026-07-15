import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-Cew2veTb.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { z } from "zod/v4";

//#region src/executors/plan-upload/schema.ts
const planUploadExecutorSchema = z.object({
	projectRoot: z.string().min(1),
	refresh: z.boolean().default(true),
	report: z.boolean().default(false),
	sensitiveKeys: z.array(z.string().min(1)).default([]),
	verbose: z.boolean().default(false)
});

//#endregion
//#region src/executors/plan-upload/plan-upload.ts
const runExecutor = async (options) => {
	const logger = getPackageLogger(["plan-upload"]);
	const parseResult = planUploadExecutorSchema.safeParse(options);
	await configureLogger();
	if (!parseResult.success) {
		logger.warn("Invalid plan-upload options", {
			issues: parseResult.error.issues,
			path: options?.projectRoot ?? "plan-upload options"
		});
		return { success: false };
	}
	const { projectRoot, refresh, report, sensitiveKeys, verbose } = parseResult.data;
	await createDefaultTaskDispatcher().dispatchTask("terraformPlanUpload", {
		modulePath: projectRoot,
		refresh,
		report,
		sensitiveKeys,
		verbose
	});
	return { success: true };
};

//#endregion
export { runExecutor as default };