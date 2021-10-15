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
import { add, formatDuration, intervalToDuration } from "date-fns";
import { userMention } from "@discordjs/builders";
import { CronJob } from "cron";
import prisma from "../prisma";
import client from "../client";
import * as Sentry from "@sentry/node";
import { getGeneralMessageChannelForGuild } from "../utils/guilds";

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
      const durationMs = parseDuration(durationInput, "ms") as number;
      const duration = intervalToDuration({ start: 0, end: durationMs });

      embed.addField("Duration", formatDuration(duration));

      await prisma.mute.create({
        data: {
          guildId: interaction.guild.id,
          memberId: member.id,
          endsAt: add(new Date(), duration),
        },
      });
    } else {
      embed.addField("Duration", "indefinite");
    }

    if (reason) {
      embed.addField("Reason", reason);
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.MUTE,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

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

    await prisma.mute.deleteMany({
      where: { guildId: interaction.guild.id, memberId: member.id },
    });

    const embed = new MessageEmbed()
      .setColor("GREEN")
      .setDescription(`${userMention(member.user.id)} has been unmuted.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.UNMUTE,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

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

const clearExpiredMutes = async () => {
  const expiredMutes = await prisma.mute.findMany({
    where: { endsAt: { lte: new Date() } },
  });

  for (const mute of expiredMutes) {
    try {
      const guild = await client.guilds.fetch(mute.guildId);
      const member = await guild.members.fetch(mute.memberId);

      const role = (await getMutedRoleForGuild(guild)) as Role;

      if (member.roles.cache.has(role.id)) {
        const reason = "Mute has expired";
        await member.roles.remove(role, reason);

        const messageChannel = await getGeneralMessageChannelForGuild(guild);

        const embed = new MessageEmbed()
          .setColor("GREEN")
          .setDescription(`${userMention(member.user.id)} has been unmuted.`);
        embed.addField("Reason", reason);

        await messageChannel.send({ embeds: [embed] });
      }

      await prisma.mute.delete({ where: { id: mute.id } });
    } catch (e) {
      Sentry.captureException(e, { contexts: { mute } });
    }
  }
};

const ModerationModule: Module = {
  commands: [
    new KickCommand(),
    new BanCommand(),
    new MuteCommand(),
    new UnmuteCommand(),
  ],
  handlers: {},
  cronJobs: [new CronJob("0 * * * * *", clearExpiredMutes)],
};

export default ModerationModule;
