import { Command } from "./types.ts";
import PingCommand from "./commands/ping.ts";
import SayCommand from "./commands/say.ts";
import { discordeno, log } from "../deps.ts";
import synchronizeCommands from "./events/ready/synchronizeCommands.ts";
import logMessage from "./events/messageCreate/logMessage.ts";
import { CommandInput } from "./types.ts";
import logInteraction from "./events/interactionCreate/logInteraction.ts";
import runCommand from "./events/interactionCreate/runCommand.ts";
import ConfigCommand from "./commands/config.ts";

interface GuildsConfig {
  [guildId: string]: {
    commands?: Command[];
  };
}

type EventHandlers = {
  ready: Array<() => unknown>;
  messageCreate: Array<(message: discordeno.Message) => unknown>;
  interactionCreate: Array<(input: CommandInput) => unknown>;
};

const globalCommands: Command[] = [];

const guilds: GuildsConfig = {
  ["161167668131397642"]: {
    commands: [new PingCommand(), new SayCommand(), new ConfigCommand()],
  },
};

const eventHandlers: EventHandlers = {
  ready: [
    () => log.info("Connected to Discord gateway!"),
    synchronizeCommands,
    () => log.info("Initialization complete!"),
  ],
  messageCreate: [logMessage],
  interactionCreate: [logInteraction, runCommand],
};

const config = {
  ownerId: "98225142064250880",
  globalCommands,
  guilds,
  eventHandlers,
};

export default config;
