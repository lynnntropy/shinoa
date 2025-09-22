import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { logger } from "./logger.ts";
// import handlers from "./eventHandlers";
// import * as Sentry from "@sentry/node";

export const client = new Client({
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

client.once(Events.ClientReady, () => {
  logger.info("Client initialized.");
});

// for (const event in handlers) {
//   for (const handler of handlers[event]) {
//     client.on(event as keyof ClientEvents, async (...args) => {
//       Sentry.withScope(async (scope) => {
//         scope.setContext(`event`, {
//           name: event,
//           handler: handler.name,
//         });

//         try {
//           await handler(...args);
//         } catch (e) {
//           Sentry.captureException(e);
//           logger.error(e);
//         }
//       });
//     });
//   }
// }

// export default client;
