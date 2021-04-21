import { APIInteraction } from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import config from "../../config";
import logger from "../../logger";
import { EventHandler } from "../../types";

const handleInteraction: EventHandler<APIInteraction> = async (interaction) => {
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
};

export default handleInteraction;
