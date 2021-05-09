import {
  CommandInteraction,
  PermissionResolvable,
  Permissions,
} from "discord.js";
import config from "../config";
import { Command } from "../internal/command";

export const validateInteractionIsAllowed = async (
  interaction: CommandInteraction,
  command: Command
) => {
  if (command.isOwnerOnly) {
    if (interaction.user.id !== config.ownerId) {
      await interaction.reply({
        content: "Only the bot owner can use that command.",
        ephemeral: true,
      });

      throw new Error(
        `Owner-only command /${command.name} can't be used by user ${interaction.user.username}#${interaction.user.discriminator}.`
      );
    }

    if (command.requiredPermissions) {
      if (interaction.channel.type !== "text") {
        await interaction.reply("That command can only be used in a server.");
        throw new Error(
          `Command /${command.name} can only be used in a guild.`
        );
      }

      // The bot owner isn't limited by permissions
      if (interaction.member.user.id === config.ownerId) {
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);

      if (!member.permissions.has(command.requiredPermissions)) {
        await interaction.reply({
          content: `That command requires these permissions: ${formatPermissions(
            command.requiredPermissions
          )}`,
          ephemeral: true,
        });

        throw new Error(
          `${interaction.member.user.username}#${interaction.member.user.discriminator} ` +
            `tried to use a command they don't have the permissions for (/${command.name}).`
        );
      }
    }
  }
};

const formatPermissions = (permissions: PermissionResolvable) => {
  return new Permissions(permissions)
    .toArray()
    .map((x) => `\`${x}\``)
    .join(", ");
};
