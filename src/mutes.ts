import { userMention } from "@discordjs/builders";
import { add, formatDuration } from "date-fns";
import {
  CommandInteraction,
  Constants,
  DiscordAPIError,
  Guild,
  GuildMember,
  MessageEmbed,
  Role,
} from "discord.js";
import client from "./client";
import config from "./config";
import emitter, { ModerationEventType } from "./emitter";
import prisma from "./prisma";
import { getGeneralMessageChannelForGuild } from "./utils/guilds";
import * as Sentry from "@sentry/node";
import UserReadableError from "./internal/errors/UserReadableError";
import logger from "./logger";

interface MuteOptions {
  guild: Guild;
  member: GuildMember;
  duration?: Duration;
  reason?: string;
  initiatedBy?: GuildMember;
  interaction?: CommandInteraction;
}

interface UnmuteOptions {
  guild: Guild;
  member: GuildMember;
  reason?: string;
  initiatedBy?: GuildMember;
  interaction?: CommandInteraction;
}

export const mute = async (options: MuteOptions) => {
  const { guild, member } = options;
  const role = (await getMutedRoleForGuild(options.guild)) as Role;

  if (options.member.roles.cache.has(role.id)) {
    throw new UserReadableError("This user is already muted.");
  }

  await member.roles.add(role, options.reason);

  if (options.duration) {
    await prisma.mute.create({
      data: {
        guildId: guild.id,
        memberId: member.id,
        endsAt: add(new Date(), options.duration),
      },
    });
  }

  emitter.emit("moderationEvent", {
    type: ModerationEventType.MUTE,
    guild,
    target: member,
    moderator: options.initiatedBy,
    reason: options.reason,
  });

  const embed = new MessageEmbed()
    .setColor("RED")
    .setDescription(`${userMention(member.user.id)} has been muted.`)
    .setImage("https://i.ibb.co/74J5ZWs/image0.png");

  if (options.duration) {
    embed.addField("Duration", formatDuration(options.duration));
  } else {
    embed.addField("Duration", "indefinite");
  }

  if (options.reason) {
    embed.addField("Reason", options.reason);
  }
  if (options.interaction) {
    await options.interaction.reply({
      embeds: [embed],
    });
  } else {
    const channel = await getGeneralMessageChannelForGuild(guild);
    await channel.send({ embeds: [embed] });
  }
};

export const unmute = async (options: UnmuteOptions) => {
  const { guild, member } = options;
  const role = (await getMutedRoleForGuild(guild)) as Role;

  if (!member.roles.cache.has(role.id)) {
    throw new UserReadableError("This user isn't muted.");
  }

  await member.roles.remove(role, options.reason);

  await prisma.mute.deleteMany({
    where: { guildId: guild.id, memberId: member.id },
  });

  emitter.emit("moderationEvent", {
    type: ModerationEventType.UNMUTE,
    guild: guild,
    target: member,
    moderator: options.initiatedBy,
    reason: options.reason,
  });

  const embed = new MessageEmbed()
    .setColor("GREEN")
    .setDescription(`${userMention(member.user.id)} has been unmuted.`);

  if (options.reason) {
    embed.addField("Reason", options.reason);
  }

  if (options.interaction) {
    await options.interaction.reply({
      embeds: [embed],
    });
  } else {
    const channel = await getGeneralMessageChannelForGuild(guild);
    await channel.send({ embeds: [embed] });
  }
};

export const clearExpiredMutes = async () => {
  const expiredMutes = await prisma.mute.findMany({
    where: { endsAt: { lte: new Date() } },
  });

  for (const mute of expiredMutes) {
    try {
      const guild = await client.guilds.fetch(mute.guildId);
      const member = await guild.members.fetch(mute.memberId);

      await unmute({
        guild,
        member,
        reason: "Mute has expired",
      });
    } catch (e) {
      if (e instanceof DiscordAPIError) {
        if (e.code === Constants.APIErrors.UNKNOWN_MEMBER) {
          logger.warn(
            `Mute ID ${mute.id} references unknown member ID ${mute.memberId}. This mute will be pruned.`
          );

          await prisma.mute.delete({ where: { id: mute.id } });
          continue;
        }
      }

      Sentry.captureException(e, { contexts: { mute } });
    }
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
