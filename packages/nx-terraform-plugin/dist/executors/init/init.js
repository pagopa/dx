import { t as createDefaultTaskDispatcher } from "../../default-dispatcher-CEI5_roQ.js";
import { n as getPackageLogger, t as configureLogger } from "../../logger-DZ1KFLzv.js";
import { z } from "zod/v4";

//#region src/executors/init/schema.ts
/**
* Validates options accepted by the Terraform initialization executor.
*/
const initExecutorSchema = z.object({
	args: z.array(z.string()).default([]),
	frozenLockfile: z.boolean().default(false),
	projectRoot: z.string().min(1)
});

//#endregion
//#region src/executors/init/init.ts
const runExecutor = async (options) => {
	const logger = getPackageLogger(["init"]);
	const parseResult = initExecutorSchema.safeParse(options);
	await configureLogger();
	if (!parseResult.success) {
		logger.error("Invalid init options", {
			issues: parseResult.error.issues,
			path: options.projectRoot ?? "init options"
		});
		return { success: false };
	}
	const { args, frozenLockfile, projectRoot } = parseResult.data;
	await createDefaultTaskDispatcher().dispatchTask("terraformInit", {
		args,
		frozenLockfile,
		modulePath: projectRoot
	});
	return { success: true };
};

//#endregion
export { runExecutor as default };