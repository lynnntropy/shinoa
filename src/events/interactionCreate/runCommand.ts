import config from "../../config.ts";
import { CommandInput } from "../../types.ts";

const runCommand = (input: CommandInput) => {
  for (const command of config.guilds[input.guild_id].commands ?? []) {
    if (command.name === input.data?.name) {
      command.process(input);
      return;
    }
  }

  for (const command of config.globalCommands) {
    if (command.name === input.data?.name) {
      command.process(input);
      return;
    }
  }
};

export default runCommand;
