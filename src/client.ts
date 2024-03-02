import { Client, ClientEvents, GatewayIntentBits, Partials } from "discord.js";
import handlers from "./eventHandlers";
import * as Sentry from "@sentry/node";
import logger from "./logger";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.User,
    Partials.GuildMember,
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
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
