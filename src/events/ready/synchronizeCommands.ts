import { Snowflake } from "discord-api-types";
import client from "../../client";
import config from "../../config";
import {
  deleteGuildCommand,
  getGuildCommands,
  registerCommand,
} from "../../discord/api";
import logger from "../../logger";
import { EventHandler } from "../../types";

const synchronizeCommands: EventHandler<void> = async () => {
  logger.info("Synchronizing commands...");

  for (const guildId in config.guilds) {
    if (config.guilds[guildId].commands) {
      logger.debug(
        `Synchronizing commands for ${
          (await client.guilds.fetch(guildId)).name
        }...`
      );

      for (const command of config.guilds[guildId].commands) {
        logger.debug(`Registering command /${command.name}...`);
        await registerCommand(command, guildId as Snowflake);
      }

      const existingCommands = await getGuildCommands(guildId as Snowflake);
      for (const command of existingCommands) {
        if (
          config.guilds[guildId].commands.find(
            (c) => c.name === command.name
          ) === undefined
        ) {
          logger.debug(`Deleting stale command /${command.name}...`);
          await deleteGuildCommand(guildId as Snowflake, command.id);
        }
      }
    }
  }

  logger.info("All commands synchronized.");
};

export default synchronizeCommands;
