import { discordeno, log } from "../deps.ts";
import config from "./config.ts";

const token = Deno.env.get("TOKEN");
if (!token) {
  log.error("TOKEN variable is required.");
  Deno.exit(1);
}

discordeno.startBot({
  token,
  intents: ["GUILDS", "GUILD_MESSAGES"],
  eventHandlers: {
    ready: async () => {
      for (const handler of config.eventHandlers.ready) {
        await handler();
      }
    },
    messageCreate: async (message) => {
      for (const handler of config.eventHandlers.messageCreate) {
        await handler(message);
      }
    },
    interactionCreate: async (input) => {
      for (const handler of config.eventHandlers.interactionCreate) {
        await handler(input);
      }
    },
  },
});
