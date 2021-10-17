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
import { EventHandler, Module } from "../internal/types";
import parseDuration from "parse-duration";
import { add, formatDuration, intervalToDuration } from "date-fns";
import { bold, userMention } from "@discordjs/builders";
import { CronJob } from "cron";
import prisma from "../prisma";
import client from "../client";
import * as Sentry from "@sentry/node";
import { getGeneralMessageChannelForGuild } from "../utils/guilds";
import { getKeyValueItem, updateKeyValueItem } from "../keyValueStore";
import logger from "../logger";

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
      guild: interaction.guild,
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
      guild: interaction.guild,
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
      .setDescription(`${userMention(member.user.id)} has been muted.`)
      .setImage("https://i.ibb.co/74J5ZWs/image0.png");

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
      guild: interaction.guild,
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
      guild: interaction.guild,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class BlacklistCommand extends Command {
  name = "blacklist";
  description = "Blacklists a user ID.";
  requiredPermissions: PermissionResolvable = ["BAN_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user-id",
      description: "The ID of the user you want to blacklist.",
      type: "STRING",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the blacklist.",
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

    const userId = interaction.options.getString("user-id", true).trim();
    const reason = interaction.options.getString("reason");

    if (/^\d{10,}$/.test(userId) !== true) {
      await interaction.reply({
        content: "That doesn't seem to be a valid ID.",
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members
      .fetch(userId)
      .catch(() => null);

    if (member !== null) {
      await interaction.reply({
        content: `It looks like ${member.user.tag} is already in this server. Did you mean to ban them instead?`,
        ephemeral: true,
      });
      return;
    }

    const blacklist = await getKeyValueItem<string[]>(
      `guilds.${interaction.guild.id}.blacklist`
    );
    if (blacklist !== null && blacklist.includes(userId)) {
      await interaction.reply({
        content: `User ID ${userId} is already on the blacklist.`,
        ephemeral: true,
      });
      return;
    }

    await updateKeyValueItem<string[]>(
      `guilds.${interaction.guild.id}.blacklist`,
      (current) => {
        const blacklist = current ?? [];
        return [...blacklist, userId];
      }
    );

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`User ID ${userId} has been blacklisted.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.BLACKLIST,
      note: `Blacklisted user ID ${bold(userId)}.`,
      guild: interaction.guild,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class UnblacklistCommand extends Command {
  name = "unblacklist";
  description = "Removes a user ID from the blacklist.";
  requiredPermissions: PermissionResolvable = ["BAN_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user-id",
      description: "The ID of the user you want to unblacklist.",
      type: "STRING",
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the unblacklist.",
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

    const userId = interaction.options.getString("user-id", true).trim();
    const reason = interaction.options.getString("reason");

    if (/^\d{10,}$/.test(userId) !== true) {
      await interaction.reply({
        content: "That doesn't seem to be a valid ID.",
        ephemeral: true,
      });
      return;
    }

    const blacklist =
      (await getKeyValueItem<string[]>(
        `guilds.${interaction.guild.id}.blacklist`
      )) ?? [];

    if (!blacklist.includes(userId)) {
      await interaction.reply({
        content: `User ID ${userId} isn't on the blacklist.`,
        ephemeral: true,
      });
      return;
    }

    await updateKeyValueItem<string[]>(
      `guilds.${interaction.guild.id}.blacklist`,
      (current) => {
        const blacklist = current ?? [];
        return blacklist.filter((item) => item !== userId);
      }
    );

    const embed = new MessageEmbed()
      .setColor("GREEN")
      .setDescription(`User ID ${userId} has been unblacklisted.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.UNBLACKLIST,
      note: `Unblacklisted user ID ${bold(userId)}.`,
      guild: interaction.guild,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    await interaction.reply({
      embeds: [embed],
    });
  }
}

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  logger.debug(member);

  const blacklist = await getKeyValueItem<string[]>(
    `guilds.${member.guild.id}.blacklist`
  );

  if (blacklist === null) {
    return;
  }

  if (blacklist.includes(member.user.id)) {
    const reason = `User ID ${member.user.id} is blacklisted`;

    await member.ban({ reason });

    emitter.emit("moderationEvent", {
      type: ModerationEventType.BAN,
      guild: member.guild,
      target: member,
      reason,
    });

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`${bold(member.user.tag)} has been banned.`)
      .addField("Reason", reason);

    const channel = await getGeneralMessageChannelForGuild(member.guild);
    await channel.send({ embeds: [embed] });
  }
};

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
    new BlacklistCommand(),
    new UnblacklistCommand(),
  ],
  handlers: {
    guildMemberAdd: [handleGuildMemberAdd],
  },
  cronJobs: [new CronJob("0 * * * * *", clearExpiredMutes)],
};

export default ModerationModule;
