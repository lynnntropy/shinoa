import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from "discord.js";
import { logger } from "./logger.ts";
import { MiscModule } from "./modules/MiscModule.ts";
import { withContext } from "@logtape/logtape";
// import * as Sentry from "@sentry/node";

const moduleLogger = logger.getChild("discord.js");

const modules = [
  MiscModule,
];

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

client.on(Events.InteractionCreate, async (interaction) => {
  await withContext(
    { event: Events.InteractionCreate, interaction },
    async () => {
      if (interaction.isChatInputCommand()) {
        const command = modules
          .flatMap((m) => m.slashCommands ?? [])
          .find((c) => c.signature.name === interaction.commandName);

        if (!command) {
          moduleLogger.warn(
            `Received interaction for unknown command /${interaction.commandName}.`,
          );
          return;
        }

        try {
          await command.run(interaction);
        } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "There was an error while executing this command!",
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.reply({
              content: "There was an error while executing this command!",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    },
  );
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
