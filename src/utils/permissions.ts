import {
  ChannelType,
  CommandInteraction,
  PermissionResolvable,
  PermissionsBitField,
} from "discord.js";
import config from "../config";
import { Command } from "../internal/command";
import { buildUsernameString } from "./strings";

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
        `Owner-only command /${
          command.name
        } can't be used by user ${buildUsernameString(interaction.user)}.`
      );
    }
  }

  if (
    command.requiredPermissions &&
    new PermissionsBitField(
      PermissionsBitField.resolve(command.requiredPermissions)
    ).toArray().length > 0
  ) {
    if (
      ![
        ChannelType.GuildText,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
      ].includes(interaction.channel!.type)
    ) {
      await interaction.reply({
        content: "That command can only be used in a server.",
        ephemeral: true,
      });
      throw new Error(`Command /${command.name} can only be used in a guild.`);
    }

    // The bot owner isn't limited by permissions
    if (interaction.member?.user.id === config.ownerId) {
      return;
    }

    const member = await interaction.guild!.members.fetch(interaction.user.id);

    if (!member.permissions.has(command.requiredPermissions)) {
      await interaction.reply({
        content: `That command requires these permissions: ${formatPermissions(
          command.requiredPermissions
        )}`,
        ephemeral: true,
      });

      throw new Error(
        `${buildUsernameString(interaction.member!.user)} ` +
          `tried to use a command they don't have the permissions for (/${command.name}).`
      );
    }
  }
};

const formatPermissions = (permissions: PermissionResolvable) => {
  return new PermissionsBitField(permissions)
    .toArray()
    .map((x) => `\`${x}\``)
    .join(", ");
};
