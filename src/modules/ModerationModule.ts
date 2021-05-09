import {
  ApplicationCommandOptionData,
  CommandInteraction,
  GuildMember,
  PermissionResolvable,
} from "discord.js";
import { Command } from "../internal/command";
import { Module } from "../internal/types";

class KickCommand extends Command {
  name = "kick";
  description = "Kick a user.";
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to kick.",
      type: "USER",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the kick.",
      type: "STRING",
    },
  ];

  async handle(interaction: CommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.options[0].value as string;
    const reason = interaction.options[1]
      ? (interaction.options[1].value as string)
      : undefined;

    const member = await interaction.guild.members.fetch(userId);
    await (member as GuildMember).kick(reason);

    await interaction.reply(
      `${member.user.username}#${member.user.discriminator} has been kicked.` +
        `\n\n**Reason:** ${reason ?? "(not set)"}`
    );
  }
}

class BanCommand extends Command {
  name = "ban";
  description = "Ban a user.";
  requiredPermissions: PermissionResolvable = ["BAN_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to ban.",
      type: "USER",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the ban.",
      type: "STRING",
    },
  ];

  async handle(interaction: CommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.options[0].value as string;
    const reason = interaction.options[1]
      ? (interaction.options[1].value as string)
      : undefined;

    const member = await interaction.guild.members.fetch(userId);
    await member.ban({ reason });

    await interaction.reply(
      `${member.user.username}#${member.user.discriminator} has been banned.` +
        `\n\n**Reason:** ${reason ?? "(not set)"}`
    );
  }
}

const ModerationModule: Module = {
  commands: [new KickCommand(), new BanCommand()],
  handlers: {},
};

export default ModerationModule;
