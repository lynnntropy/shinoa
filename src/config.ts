import { Command } from "./types.ts";
import PingCommand from "./commands/ping.ts";

const commands: Command[] = [new PingCommand()];

const guildCommands: { [guildId: string]: Command[] } = {
  // Vesko's Workshop
  ["161167668131397642"]: commands,
};

const config = {
  commands,
  guildCommands,
};

export default config;
