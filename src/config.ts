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
import { safeGetEnvironmentVariable } from "./util/config.ts";

interface GuildsConfig {
  [guildId: string]: {
    commands?: Command[];
  };
}

const globalCommands: Command[] = [];

const guilds: GuildsConfig = {
  ["161167668131397642"]: {
    commands: [new PingCommand(), new SayCommand(), new ConfigCommand()],
  },
};

type EventHandlers = {
  discord: {
    ready: Array<() => unknown>;
    messageCreate: Array<(message: discordeno.Message) => unknown>;
    interactionCreate: Array<(input: CommandInput) => unknown>;
  };
};

const eventHandlers: EventHandlers = {
  discord: {
    ready: [
      () => log.info("Connected to Discord gateway!"),
      synchronizeCommands,
      () => log.info("Initialization complete!"),
    ],
    messageCreate: [logMessage],
    interactionCreate: [logInteraction, runCommand],
  },
};

const environment = {
  TOKEN: safeGetEnvironmentVariable("TOKEN"),
  LOG_LEVEL: Deno.env.get("LOG_LEVEL") ?? "INFO",
  DATABASE_HOST: Deno.env.get("DATABASE_HOST") ?? "db",
  DATABASE_USERNAME: Deno.env.get("DATABASE_USERNAME") ?? "postgres",
  DATABASE_PASSWORD: Deno.env.get("DATABASE_PASSWORD") ?? "postgres",
  DATABASE_NAME: Deno.env.get("DATABASE_NAME") ?? "shinoa",
};

const config = {
  ownerId: "98225142064250880",
  applicationId: "833659808187678771",
  environment,
  globalCommands,
  guilds,
  eventHandlers,
};

export default config;
