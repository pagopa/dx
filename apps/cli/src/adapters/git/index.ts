import { $ } from "execa";

export const push = (cwd: string, branch: string) =>
  $({ cwd, shell: true })`git push -u origin ${branch}`;

export const commit = (cwd: string, message: string) =>
  $({ cwd, shell: true })`git commit --no-gpg-sign -m "${message}"`;

export const checkout = (cwd: string, branch: string) =>
  $({ cwd, shell: true })`git branch -M ${branch}`;
