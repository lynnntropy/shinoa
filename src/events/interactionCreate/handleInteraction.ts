import { APIInteraction } from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import config from "../../config";
import logger from "../../logger";
import { Command, EventHandler } from "../../types";
import { validateInteractionIsAllowed } from "../../utils/permissions";

const handleFoundCommand = async (
  interaction: APIInteraction,
  command: Command
) => {
  try {
    await validateInteractionIsAllowed(interaction, command);
  } catch (e) {
    logger.warn(e);
    return;
  }

  try {
    command.handle(interaction);
  } catch (e) {
    logger.warn(e);
    return;
  }
};

const handleInteraction: EventHandler<APIInteraction> = async (interaction) => {
  logger.trace(interaction);

  // Guild commands (if applicable)

  if (
    isGuildInteraction(interaction) &&
    config.guilds[interaction.guild_id] &&
    config.guilds[interaction.guild_id].commands
  ) {
    for (const command of config.guilds[interaction.guild_id].commands) {
      if (command.name === interaction.data.name) {
        await handleFoundCommand(interaction, command);
        return;
      }
    }
  }

  // Global commands

  for (const command of config.globalCommands) {
    if (command.name === interaction.data.name) {
      await handleFoundCommand(interaction, command);
      return;
    }
  }

  logger.warn(`Didn't handle unknown command /${interaction.data.name}`);
};

export default handleInteraction;
