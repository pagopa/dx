import {
  type DockerRunOptions,
  dockerRunOptionsSchema,
} from "../../docker-run.ts";

export const dockerBuildExecutorSchema = dockerRunOptionsSchema;

export type DockerBuildExecutorInput = Partial<DockerBuildExecutorSchema>;

export type DockerBuildExecutorSchema = DockerRunOptions;
