import { $ } from "execa";

export const git$ = $({
  shell: true,
});

export const push = (cwd: string, branch: string) =>
  git$({ cwd })`git push -u origin ${branch}`;

export const commit = (cwd: string, message: string) =>
  git$({ cwd })`git commit --no-gpg-sign -m "${message}"`;

export const checkout = (cwd: string, branch: string) =>
  git$({ cwd })`git branch -M ${branch}`;
