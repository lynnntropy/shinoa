import { discordeno, log } from "../deps.ts";
import config from "./config.ts";
import "./database/database.ts";

await log.setup({
  handlers: {
    default: new log.handlers.ConsoleHandler(
      config.environment.LOG_LEVEL as log.LevelName
    ),
  },
  loggers: {
    default: { level: "DEBUG", handlers: ["default"] },
  },
});

log.info(`Log level set to ${config.environment.LOG_LEVEL}.`);

discordeno.startBot({
  token: config.environment.TOKEN,
  intents: ["GUILDS", "GUILD_MESSAGES"],
  eventHandlers: {
    ready: async () => {
      for (const handler of config.eventHandlers.discord.ready) {
        await handler();
      }
    },
    messageCreate: async (message) => {
      for (const handler of config.eventHandlers.discord.messageCreate) {
        await handler(message);
      }
    },
    interactionCreate: async (input) => {
      for (const handler of config.eventHandlers.discord.interactionCreate) {
        await handler(input);
      }
    },
  },
});
