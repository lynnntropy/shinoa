import config from "../../config";
import logger from "../../logger";
import { validateInteractionIsAllowed } from "../../utils/permissions";
import axios from "axios";
import { CommandInteraction } from "discord.js";
import { EventHandler } from "../../internal/types";
import { Command } from "../../internal/command";

const handleFoundCommand = async (
  interaction: CommandInteraction,
  command: Command
) => {
  try {
    await validateInteractionIsAllowed(interaction, command);
  } catch (e: any) {
    logger.warn(e);
    return;
  }

  try {
    await command.handleInteraction(interaction);
  } catch (e: any) {
    logger.warn(e);

    if (axios.isAxiosError(e) && e.response) {
      logger.warn(e.response.data);
    }

    return;
  }
};

const handleInteraction: EventHandler<"interaction"> = async (interaction) => {
  logger.trace(interaction);
  if (!interaction.isCommand()) {
    return;
  }

  // Guild commands (if applicable)

  if (
    interaction.guild &&
    config.guilds[interaction.guild.id] &&
    config.guilds[interaction.guild.id].commands
  ) {
    for (const command of config.guilds[interaction.guild.id].commands!) {
      if (command.name === interaction.commandName) {
        await handleFoundCommand(interaction, command);
        return;
      }
    }
  }

  // Global commands

  for (const command of config.globalCommands) {
    if (command.name === interaction.commandName) {
      await handleFoundCommand(interaction, command);
      return;
    }
  }

  logger.warn(`Didn't handle unknown command /${interaction.commandName}`);
};

export default handleInteraction;
