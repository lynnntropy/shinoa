import {
  ApplicationCommandOptionData,
  Guild,
  GuildMember,
  PermissionResolvable,
  Role,
  ButtonInteraction,
  Message,
  Snowflake,
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ComponentType,
} from "discord.js";
import config from "../config";
import emitter, { ModerationEventType } from "../emitter";
import { Command } from "../internal/command";
import { EventHandler, Module } from "../internal/types";
import parseDuration from "parse-duration";
import { intervalToDuration } from "date-fns";
import { bold, userMention } from "@discordjs/builders";
import { CronJob } from "cron";
import { getGeneralMessageChannelForGuild } from "../utils/guilds";
import { getKeyValueItem, updateKeyValueItem } from "../keyValueStore";
import { clearExpiredMutes, mute, unmute } from "../mutes";
import logger from "../logger";
import { uniq } from "lodash";
import { buildUsernameString } from "../utils/strings";

class KickCommand extends Command {
  name = "kick";
  description = "Kick a user.";
  requiredPermissions: PermissionResolvable = ["KickMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to kick.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the kick.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    await member.kick(reason ?? undefined);

    emitter.emit("moderationEvent", {
      type: ModerationEventType.KICK,
      guild: interaction.guild,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `${bold(buildUsernameString(member.user))} has been kicked.`
      );

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    await interaction.reply({ embeds: [embed] });
  }
}

class BanCommand extends Command {
  name = "ban";
  description = "Ban a user.";
  requiredPermissions: PermissionResolvable = ["BanMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to ban.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "purge",
      description:
        "Turning this on will purge the last 7 days of messages from this user.",
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: "reason",
      description: "The reason for the ban.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.options.getMember("user") as GuildMember | null;
    const purge = interaction.options.getBoolean("purge") ?? false;
    const reason = interaction.options.getString("reason");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    await member.ban({
      reason: reason ?? undefined,
      deleteMessageSeconds: purge ? 7 * 24 * 60 * 60 : undefined,
    });

    emitter.emit("moderationEvent", {
      type: ModerationEventType.BAN,
      guild: interaction.guild,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `${bold(buildUsernameString(member.user))} has been banned.`
      );

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    await interaction.reply({ embeds: [embed] });
  }
}

class UnbanCommand extends Command {
  name = "unban";
  description = "Unban a user by ID.";
  requiredPermissions: PermissionResolvable = ["BanMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user-id",
      description: "The ID of the user you want to unban.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the unban.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const userId = interaction.options.getString("user-id", true);
    const reason = interaction.options.getString("reason");

    await interaction.guild.members.unban(userId, reason ?? undefined);

    emitter.emit("moderationEvent", {
      type: ModerationEventType.UNBAN,
      guild: interaction.guild,
      note: `User ID ${userId}`,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`User ID ${userId} has been unbanned.`);

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    await interaction.reply({ embeds: [embed] });
  }
}

class MuteCommand extends Command {
  name = "mute";
  description = "Mutes a user.";
  requiredPermissions: PermissionResolvable = ["KickMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to mute.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the mute.",
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "duration",
      description: `The duration of the mute (e.g. "1hr 20m").`,
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason");
    const durationInput = interaction.options.getString("duration");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    let duration: Duration | undefined = undefined;

    if (durationInput !== null) {
      const durationMs = parseDuration(durationInput, "ms") as number;
      duration = intervalToDuration({ start: 0, end: durationMs });
    }

    await mute({
      guild: interaction.guild!,
      member,
      reason: reason ?? undefined,
      duration,
      interaction,
      initiatedBy: (interaction.member as GuildMember | null) ?? undefined,
    });
  }
}

class UnmuteCommand extends Command {
  name = "unmute";
  description = "Unmutes a user.";
  requiredPermissions: PermissionResolvable = ["KickMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to unmute.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the unmute.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    await unmute({
      guild: interaction.guild!,
      member,
      reason: reason ?? undefined,
      interaction,
      initiatedBy: (interaction.member as GuildMember | null) ?? undefined,
    });
  }
}

class BlacklistCommand extends Command {
  name = "blacklist";
  description = "Blacklists a user ID (or a list of IDs).";
  requiredPermissions: PermissionResolvable = ["BanMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user-ids",
      description:
        "The ID (or list of IDs) of the user(s) you want to blacklist.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the blacklist.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const userIdsInput = interaction.options.getString("user-ids", true).trim();
    const reason = interaction.options.getString("reason");

    const ids = uniq(userIdsInput.match(/\d{10,}/g));
    let exceptions: string[] = [];
    let validatedIds: string[] = [];

    if (!ids || ids.length === 0) {
      await interaction.reply({
        content:
          "No IDs found in the `user-ids` option, please check your input.\n\nThe input to this command can be a single ID, or a list of IDs separated by anything that isn't a number.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const currentBlacklist = await getKeyValueItem<string[]>(
      `guilds.${interaction.guild.id}.blacklist`
    );

    const validateId = async (userId: Snowflake) => {
      const member = await interaction
        .guild!.members.fetch(userId)
        .catch(() => null);

      if (member) {
        exceptions.push(
          `${userMention(userId)} (ID ${userId}) is already in the server.`
        );

        return;
      }

      if (currentBlacklist !== null && currentBlacklist.includes(userId)) {
        exceptions.push(`ID ${userId} is already on the blacklist.`);

        return;
      }

      validatedIds.push(userId);
    };

    await Promise.all(ids.map(validateId));

    await updateKeyValueItem<string[]>(
      `guilds.${interaction.guild.id}.blacklist`,
      (current) => {
        const blacklist = current ?? [];
        return [...blacklist, ...validatedIds];
      }
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `${bold(
          validatedIds.length.toString(10)
        )} user IDs have been blacklisted.`
      );

    if (exceptions.length > 0) {
      embed.addFields({
        name: "Skipped IDs",
        value: exceptions.map((e) => `- ${e}`).join(`  \n`),
      });
    }

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    for (const userId of validatedIds) {
      emitter.emit("moderationEvent", {
        type: ModerationEventType.BLACKLIST,
        note: `Blacklisted user ID ${bold(userId)}.`,
        guild: interaction.guild,
        moderator: interaction.member as GuildMember,
        reason: reason ?? undefined,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });
  }
}

class UnblacklistCommand extends Command {
  name = "unblacklist";
  description = "Removes a user ID from the blacklist.";
  requiredPermissions: PermissionResolvable = ["BanMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user-id",
      description: "The ID of the user you want to unblacklist.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the unblacklist.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
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

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`User ID ${userId} has been unblacklisted.`);

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
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

class LockChannelCommand extends Command {
  name = "lock-channel";
  description =
    "Locks the current channel so that only people with elevated permissions can talk in it.";
  requiredPermissions: PermissionResolvable = ["ManageChannels"];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.channel === null) {
      throw Error("`interaction.channel` can't be null for this command.");
    }

    if (interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: `This type of channel (\`${interaction.channel.type}\`) can't be locked.`,
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel;
    const roles = await interaction.guild.roles.fetch();

    for (const [_, role] of roles) {
      if (channel.permissionsFor(role).has(PermissionFlagsBits.SendMessages)) {
        await channel.permissionOverwrites.create(role, {
          SendMessages: role.permissions.has(
            PermissionFlagsBits.ManageChannels
          ),
        });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `The channel has been locked.\n\nSending messages has been restricted to members with the **Manage Channels** permission.`
      );

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class UnlockChannelCommand extends Command {
  name = "unlock-channel";
  description = "Unlocks a previously locked channel.";
  requiredPermissions: PermissionResolvable = ["ManageChannels"];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    if (interaction.channel === null) {
      throw Error("`interaction.channel` can't be null for this command.");
    }

    if (interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: `This type of channel (\`${interaction.channel.type}\`) can't be locked.`,
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel;
    const roles = await interaction.guild.roles.fetch();

    for (const [_, role] of roles) {
      if (
        role.permissions.has(PermissionFlagsBits.SendMessages) &&
        !channel.permissionsFor(role).has(PermissionFlagsBits.SendMessages)
      ) {
        await channel.permissionOverwrites.delete(role);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(`The channel has been unlocked.`);

    await interaction.reply({
      embeds: [embed],
    });
  }
}

class DungeonCommand extends Command {
  name = "dungeon";
  description =
    "Throws a user into the dungeon (restricts them to a dungeon channel).";
  requiredPermissions: PermissionResolvable = ["KickMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to dungeon.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the dungeon.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const role = (await getDungeonRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User is already in the dungeon.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.add(role, reason ?? undefined);

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `${userMention(member.user.id)} has been thrown into the dungeon.`
      )
      .setImage("https://i.ibb.co/xzVTSXC/ezgif-com-optimize-2.gif");

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.DUNGEON,
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

class UndungeonCommand extends Command {
  name = "undungeon";
  description = "Releases a user from the dungeon.";
  requiredPermissions: PermissionResolvable = ["KickMembers"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to undungeon.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "The reason for the undungeon.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const role = (await getDungeonRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user") as GuildMember | null;
    const reason = interaction.options.getString("reason");

    if (!member) {
      await interaction.reply({
        content: "User not found.",
        ephemeral: true,
      });
      return;
    }

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User isn't in the dungeon.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.remove(role, reason ?? undefined);

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setDescription(
        `${userMention(member.user.id)} has been released from the dungeon.`
      );

    if (reason) {
      embed.addFields({ name: "Reason", value: reason });
    }

    emitter.emit("moderationEvent", {
      type: ModerationEventType.UNDUNGEON,
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

class ClearRolesCommand extends Command {
  name = "clear-roles";
  description = "Removes roles that match a given pattern from all members.";
  requiredPermissions: PermissionResolvable = ["ManageRoles"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "pattern",
      description:
        "A regular expression describing the roles that should be cleared.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    let pattern: RegExp;

    try {
      pattern = new RegExp(interaction.options.getString("pattern", true), "i");
    } catch (e) {
      await interaction.reply({
        content: `Pattern is invalid: \`${e}\``,
        ephemeral: true,
      });
      return;
    }

    const roles = (await interaction.guild!.roles.fetch()).filter((r) =>
      pattern.test(r.name)
    );

    if (roles.size === 0) {
      await interaction.reply({
        content: `No roles found matching pattern \`${pattern.source}\`.`,
        ephemeral: true,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("continue")
        .setLabel("Yes, continue")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      ephemeral: true,
      content:
        `The following roles will be removed from all members. Are you sure you want to continue?\n\n` +
        roles.map((r) => `- ${r.name}`).join(`\n`),
      components: [row],
    });

    const reply = (await interaction.fetchReply()) as Message;

    const filter = (i: ButtonInteraction) => i.user.id === interaction.user.id;

    try {
      const replyInteraction = await reply.awaitMessageComponent({
        filter,
        componentType: ComponentType.Button,
        time: 300_000, // 5 minutes
      });

      if (replyInteraction.customId === "continue") {
        await replyInteraction.deferUpdate();

        let count = 0;

        for (const [, role] of roles) {
          console.log(role.members);
          for (const [, member] of role.members) {
            try {
              await member.roles.remove(role);
              count++;
            } catch (e) {
              logger.warn(
                e,
                `Failed to remove role from user ${buildUsernameString(
                  member.user
                )}.`
              );
            }
          }
        }

        await replyInteraction.editReply({
          content: `Roles successfully cleared (${count} individual roles removed).`,
          components: [],
        });

        return;
      }

      await interaction.editReply({
        content: "Operation cancelled.",
        components: [],
      });
    } catch (e) {
      logger.warn(e);
    }
  }
}

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
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

    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setDescription(
        `${bold(buildUsernameString(member.user))} has been banned.`
      )
      .addFields({ name: "Reason", value: reason });

    const channel = await getGeneralMessageChannelForGuild(member.guild);
    await channel.send({ embeds: [embed] });
  }
};

const getDungeonRoleForGuild = async (
  guild: Guild,
  throwOnNotFound: boolean = true
): Promise<Role | null> => {
  const roleId = config.guilds[guild.id].moderation?.dungeonRoleId;

  if (roleId) {
    const role = await guild.roles.fetch(roleId);

    if (role === null && throwOnNotFound) {
      throw Error(`Guild has no role ID ${roleId}.`);
    }

    return role;
  }

  const roles = await guild.roles.fetch();
  const role =
    roles.find((r) => r.name.toLowerCase().trim().startsWith("dungeon")) ??
    null;

  if (role === null && throwOnNotFound) {
    throw Error(
      `Guild has no configured dungeon role and no role could be found automatically.`
    );
  }

  return role;
};

const ModerationModule: Module = {
  commands: [
    new KickCommand(),
    new BanCommand(),
    new UnbanCommand(),
    new MuteCommand(),
    new UnmuteCommand(),
    new BlacklistCommand(),
    new UnblacklistCommand(),
    new LockChannelCommand(),
    new UnlockChannelCommand(),
    new DungeonCommand(),
    new UndungeonCommand(),
    new ClearRolesCommand(),
  ],
  handlers: {
    guildMemberAdd: [handleGuildMemberAdd],
  },
  cronJobs: [new CronJob("0 * * * * *", clearExpiredMutes)],
};

export default ModerationModule;
