import { Snowflake } from "discord-api-types";
import client from "../../client";
import config from "../../config";
import { registerCommand } from "../../discord/api";
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
        await registerCommand(command, guildId as Snowflake);
      }
    }
  }

  logger.info("All commands synchronized.");
};

export default synchronizeCommands;
