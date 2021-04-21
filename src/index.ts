import logger from "./logger";
import { Client } from "discord.js";
import config from "./config";
import { registerCommand } from "./discord/api";
import {
  APIInteraction,
  GatewayDispatchEvents,
  Snowflake,
} from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import environment from "./environment";

const client = new Client();

client.ws.on(
  // @ts-ignore
  GatewayDispatchEvents.InteractionCreate,
  (interaction: APIInteraction) => {
    logger.trace(interaction);
    if (
      isGuildInteraction(interaction) &&
      config.guilds[interaction.guild_id] &&
      config.guilds[interaction.guild_id].commands
    ) {
      for (const command of config.guilds[interaction.guild_id].commands) {
        if (command.name === interaction.data.name) {
          command.handle(interaction);
          return;
        }
      }
    }

    // todo global commands
  }
);

client.on("ready", async () => {
  logger.info(
    `Connected to Discord as ${client.user.username}#${client.user.discriminator}!`
  );

  for (const guildId in config.guilds) {
    if (config.guilds[guildId].commands) {
      for (const command of config.guilds[guildId].commands) {
        await registerCommand(command, guildId as Snowflake);
      }
    }
  }
});

logger.info("Starting client...");
client.login(environment.TOKEN);
