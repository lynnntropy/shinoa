import { Snowflake } from "discord-api-types";
import client from "../../client";
import config from "../../config";
import {
  deleteGuildCommand,
  getGuildCommands,
  registerCommand,
  getGlobalCommands,
  deleteGlobalCommand,
  updateRegisteredCommand,
} from "../../discord/api";
import { commandMatchesRegisteredCommand } from "../../discord/utils";
import logger from "../../logger";
import { EventHandler } from "../../types";

const synchronizeCommands: EventHandler<void> = async () => {
  logger.info("Synchronizing commands...");
  logger.debug("Synchronizing global commands...");

  const existingCommands = await getGlobalCommands();

  for (const command of config.globalCommands) {
    const registeredCommand = existingCommands.find(
      (c) => c.name === command.name
    );
    if (registeredCommand !== undefined) {
      if (!commandMatchesRegisteredCommand(command, registeredCommand)) {
        await updateRegisteredCommand(registeredCommand, command);
      }
    } else {
      logger.debug(`Registering command /${command.name}...`);
      await registerCommand(command);
    }
  }

  for (const command of existingCommands) {
    if (
      config.globalCommands.find((c) => c.name === command.name) === undefined
    ) {
      logger.debug(`Deleting stale command /${command.name}...`);
      await deleteGlobalCommand(command.id);
    }
  }

  for (const guildId in config.guilds) {
    if (config.guilds[guildId].commands) {
      logger.debug(
        `Synchronizing commands for ${
          (await client.guilds.fetch(guildId)).name
        }...`
      );

      const existingCommands = await getGuildCommands(guildId as Snowflake);

      for (const command of config.guilds[guildId].commands) {
        const registeredCommand = existingCommands.find(
          (c) => c.name === command.name
        );
        if (registeredCommand !== undefined) {
          if (!commandMatchesRegisteredCommand(command, registeredCommand)) {
            await updateRegisteredCommand(
              registeredCommand,
              command,
              guildId as Snowflake
            );
          }
        } else {
          logger.debug(`Registering command /${command.name}...`);
          await registerCommand(command, guildId as Snowflake);
        }
      }

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
