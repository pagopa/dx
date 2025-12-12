import { $ } from "execa";

export const tf$ = $({
  environment: {
    NO_COLOR: "1",
    TF_IN_AUTOMATION: "1",
    TF_INPUT: "0",
  },
  shell: true,
});
