import { Command } from "commander";

const program = new Command();

program.name("DX-CLI").description("The CLI for DX-Platform").version("0.0.0");

program.parse();
