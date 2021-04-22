import { isGuildInteraction } from "discord-api-types/utils/v8";
import {
  APIApplicationCommandOption,
  APIInteraction,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandInteractionDataOptionUser,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from "discord-api-types/v8";
import { PermissionResolvable } from "discord.js";
import client from "../client";
import { respondToInteraction } from "../discord/api";
import { Command } from "../types";

export class KickCommand implements Command {
  name = "kick";
  description = "Kick a user.";
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: APIApplicationCommandOption[] = [
    {
      name: "user",
      description: "The user you want to kick.",
      type: ApplicationCommandOptionType.USER,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the kick.",
      type: ApplicationCommandOptionType.STRING,
    },
  ];

  async handle(interaction: APIInteraction) {
    if (!isGuildInteraction(interaction)) {
      throw new Error("Command must be called inside a guild.");
    }

    const userId = (interaction.data
      .options[0] as ApplicationCommandInteractionDataOptionUser).value;
    const reason = interaction.data.options[1]
      ? (interaction.data
          .options[1] as ApplicationCommandInteractionDataOptionString).value
      : undefined;

    const guild = await client.guilds.fetch(interaction.guild_id);
    const member = await guild.members.fetch(userId);
    await member.kick(reason);

    await respondToInteraction(interaction, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content:
          `${member.user.username}#${member.user.discriminator} has been kicked.` +
          `\n\n**Reason:** ${reason ?? "(not set)"}`,
      },
    });
  }
}
