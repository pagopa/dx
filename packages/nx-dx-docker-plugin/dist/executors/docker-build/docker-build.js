const require_docker_run = require('../../docker-run-CK6SNRGG.js');

//#region src/executors/docker-build/schema.ts
const dockerBuildExecutorSchema = require_docker_run.dockerRunOptionsSchema;

//#endregion
//#region src/executors/docker-build/docker-build.ts
const runExecutor = async (options, context) => {
	const parseResult = dockerBuildExecutorSchema.safeParse(options);
	if (!parseResult.success) {
		console.warn("[@pagopa/nx-dx-docker-plugin] Invalid docker:build options:", parseResult.error.issues);
		return { success: false };
	}
	return require_docker_run.runDockerCommand("build", parseResult.data, context.root);
};

//#endregion
module.exports = runExecutor;