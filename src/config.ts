import { Command } from "./types.ts";
import PingCommand from "./commands/ping.ts";
import SayCommand from "./commands/say.ts";

interface GuildsConfig {
  [guildId: string]: {
    commands?: Command[];
  };
}

const globalCommands: Command[] = [];

const guilds: GuildsConfig = {
  ["161167668131397642"]: {
    commands: [new PingCommand(), new SayCommand()],
  },
};

const config = {
  globalCommands,
  guilds,
};

export default config;
