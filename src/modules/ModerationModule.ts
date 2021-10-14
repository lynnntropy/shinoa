import {
  ApplicationCommandOptionData,
  CommandInteraction,
  Guild,
  GuildMember,
  MessageEmbed,
  PermissionResolvable,
  Role,
} from "discord.js";
import config from "../config";
import emitter, { ModerationEventType } from "../emitter";
import { Command } from "../internal/command";
import { Module } from "../internal/types";
import parseDuration from "parse-duration";
import { formatDuration, intervalToDuration } from "date-fns";
import { userMention } from "@discordjs/builders";

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

    const userId = interaction.options.data[0].value as string;
    const reason = interaction.options.data[1]
      ? (interaction.options.data[1].value as string)
      : undefined;

    const member = await interaction.guild.members.fetch(userId);
    await (member as GuildMember).kick(reason);

    emitter.emit("moderationEvent", {
      type: ModerationEventType.KICK,
      target: member,
      moderator: interaction.member as GuildMember,
      reason,
    });

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

    const userId = interaction.options.data[0].value as string;
    const reason = interaction.options.data[1]
      ? (interaction.options.data[1].value as string)
      : undefined;

    const member = await interaction.guild.members.fetch(userId);
    await member.ban({ reason });

    emitter.emit("moderationEvent", {
      type: ModerationEventType.BAN,
      target: member,
      moderator: interaction.member as GuildMember,
      reason,
    });

    await interaction.reply(
      `${member.user.username}#${member.user.discriminator} has been banned.` +
        `\n\n**Reason:** ${reason ?? "(not set)"}`
    );
  }
}

class MuteCommand extends Command {
  name = "mute";
  description = "Mutes a user.";
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to mute.",
      type: "USER",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the mute.",
      type: "STRING",
    },
    {
      name: "duration",
      description: `The duration of the mute (e.g. "1hr 20m").`,
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

    const role = (await getMutedRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");
    const durationInput = interaction.options.getString("duration");

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User is already muted.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.add(role, reason ?? undefined);

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`${userMention(member.user.id)} has been muted.`);

    if (durationInput !== null) {
      const duration = parseDuration(durationInput, "ms") as number;
      embed.addField(
        "Duration",
        formatDuration(intervalToDuration({ start: 0, end: duration }))
      );

      // todo do something w/ the duration lol
    } else {
      embed.addField("Duration", "indefinite");
    }

    if (reason) {
      embed.addField("Reason", reason);
    }

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class UnmuteCommand extends Command {
  name = "unmute";
  description = "Unmutes a user.";
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to unmute.",
      type: "USER",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the unmute.",
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

    const role = (await getMutedRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User isn't muted.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.remove(role, reason ?? undefined);

    // todo don't forget to clear the scheduled unmute if there is one

    const embed = new MessageEmbed()
      .setColor("GREEN")
      .setDescription(`${userMention(member.user.id)} has been unmuted.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    await interaction.reply({
      embeds: [embed],
    });
  }
}

const getMutedRoleForGuild = async (
  guild: Guild,
  throwOnNotFound: boolean = true
): Promise<Role | null> => {
  const roleId = config.guilds[guild.id].moderation?.mutedRoleId;

  if (roleId) {
    const role = await guild.roles.fetch(roleId);

    if (role === null && throwOnNotFound) {
      throw Error(`Guild has no role ID ${roleId}.`);
    }

    return role;
  }

  const roles = await guild.roles.fetch();
  const role =
    roles.find((r) => r.name.toLowerCase().trim() === "muted") ?? null;

  if (role === null && throwOnNotFound) {
    throw Error(
      `Guild has no configured muted role and no role could be found automatically.`
    );
  }

  return role;
};

const ModerationModule: Module = {
  commands: [
    new KickCommand(),
    new BanCommand(),
    new MuteCommand(),
    new UnmuteCommand(),
  ],
  handlers: {},
};

export default ModerationModule;
