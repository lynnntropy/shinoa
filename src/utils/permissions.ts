import {
  APIInteraction,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types";
import {
  isDMInteraction,
  isGuildInteraction,
} from "discord-api-types/utils/v8";
import { PermissionResolvable, Permissions } from "discord.js";
import client from "../client";
import config from "../config";
import { respondToInteraction } from "../discord/api";
import { Command } from "../types";

export const validateInteractionIsAllowed = async (
  interaction: APIInteraction,
  command: Command
) => {
  if (command.isOwnerOnly) {
    if (
      isGuildInteraction(interaction) &&
      interaction.member.user.id !== config.ownerId
    ) {
      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.EPHEMERAL,
          content: "Only the bot owner can use that command.",
        },
      });

      throw new Error(
        `Owner-only command /${command.name} can't be used by user ${interaction.member.user.username}#${interaction.member.user.discriminator}.`
      );
    }

    if (
      isDMInteraction(interaction) &&
      interaction.user.id !== config.ownerId
    ) {
      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.EPHEMERAL,
          content: "Only the bot owner can use that command.",
        },
      });

      throw new Error(
        `Owner-only command /${command.name} can't be used by user ${interaction.user.username}#${interaction.user.discriminator}.`
      );
    }
  }

  if (command.requiredPermissions) {
    if (isDMInteraction(interaction)) {
      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          flags: MessageFlags.EPHEMERAL,
          content: "You can't use that command in a DM.",
        },
      });
    }

    if (isGuildInteraction(interaction)) {
      // The bot owner isn't limited by permissions
      if (interaction.member.user.id === client.user.id) {
        return;
      }

      const member = await (
        await client.guilds.fetch(interaction.guild_id)
      ).members.fetch(interaction.member.user.id);
      if (!member.hasPermission(command.requiredPermissions)) {
        await respondToInteraction(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            flags: MessageFlags.EPHEMERAL,
            content: `That command requires these permissions: ${formatPermissions(
              command.requiredPermissions
            )}`,
          },
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
