import { Client, ClientEvents, Intents } from "discord.js";
import handlers from "./eventHandlers";
import * as Sentry from "@sentry/node";
import logger from "./logger";

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  partials: ["USER", "GUILD_MEMBER", "MESSAGE", "CHANNEL", "REACTION"],
});

for (const event in handlers) {
  for (const handler of handlers[event]) {
    client.on(event as keyof ClientEvents, async (...args) => {
      Sentry.withScope(async (scope) => {
        scope.setContext(`event`, {
          name: event,
          handler: handler.name,
        });

        try {
          await handler(...args);
        } catch (e) {
          Sentry.captureException(e);
          logger.error(e);
        }
      });
    });
  }
}

export default client;
