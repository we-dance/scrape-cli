#!/usr/bin/env node
import { Argv } from "yargs";

const options = (yargs: Argv) => {
  yargs.option("id", {
    describe: "id",
  });
};

require("yargs").command(
  "facebook <action>",
  "List items",
  options,
  async (args: any) => {
    console.log("faceb");
    process.exit(0);
  }
);
