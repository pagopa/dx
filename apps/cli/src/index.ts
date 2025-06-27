import { Command } from "commander";

const program = new Command();

program
  .name("DX-CLI")
  .description("The CLI for DX-Platform")
  .version(__CLI_VERSION__);

program.parse();
