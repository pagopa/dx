const require_docker_run = require('../../docker-run-B-9fZOUg.js');

//#region src/executors/docker-push/schema.ts
const dockerPushExecutorSchema = require_docker_run.dockerRunOptionsSchema;

//#endregion
//#region src/executors/docker-push/docker-push.ts
const runExecutor = async (options, context) => {
	const parseResult = dockerPushExecutorSchema.safeParse(options);
	if (!parseResult.success) {
		console.warn("[@pagopa/nx-dx-docker-plugin] Invalid docker:push options:", parseResult.error.issues);
		return { success: false };
	}
	return require_docker_run.runDockerCommand("push", parseResult.data, context.root);
};

//#endregion
module.exports = runExecutor;