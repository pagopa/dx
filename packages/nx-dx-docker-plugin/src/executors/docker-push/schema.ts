import {
  type DockerRunOptions,
  dockerRunOptionsSchema,
} from "../../docker-run.ts";

export const dockerPushExecutorSchema = dockerRunOptionsSchema;

export type DockerPushExecutorInput = Partial<DockerPushExecutorSchema>;

export type DockerPushExecutorSchema = DockerRunOptions;
