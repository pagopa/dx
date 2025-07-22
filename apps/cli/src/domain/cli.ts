import { Dependencies } from "./dependencies.js";
import { DoctorEnv, makeDoctorEnv } from "./doctor.js";
import { makeVersionEnv, VersionEnv } from "./version.js";

export type CliEnv = DoctorEnv & VersionEnv;

export const makeCliEnv = (dependencies: Dependencies): CliEnv => ({
  ...makeDoctorEnv(dependencies),
  ...makeVersionEnv(),
});
