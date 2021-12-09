import {
  ApplicationCommandOptionData,
  CommandInteraction,
  Guild,
  GuildMember,
  MessageEmbed,
  PermissionResolvable,
  Role,
  Permissions,
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

    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");

    await member.kick(reason ?? undefined);

    emitter.emit("moderationEvent", {
      type: ModerationEventType.KICK,
      guild: interaction.guild,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`${bold(member.user.tag)} has been kicked.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    await interaction.reply({ embeds: [embed] });
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
      name: "purge",
      description:
        "Turning this on will purge the last 7 days of messages from this user.",
      type: "BOOLEAN",
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

    const member = interaction.options.getMember("user", true) as GuildMember;
    const purge = interaction.options.getBoolean("purge") ?? false;
    const reason = interaction.options.getString("reason");

    await member.ban({
      reason: reason ?? undefined,
      days: purge ? 7 : undefined,
    });

    emitter.emit("moderationEvent", {
      type: ModerationEventType.BAN,
      guild: interaction.guild,
      target: member,
      moderator: interaction.member as GuildMember,
      reason: reason ?? undefined,
    });

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`${bold(member.user.tag)} has been banned.`);

    if (reason) {
      embed.addField("Reason", reason);
    }

    await interaction.reply({ embeds: [embed] });
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
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");
    const durationInput = interaction.options.getString("duration");

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
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");

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

class LockChannelCommand extends Command {
  name = "lock-channel";
  description =
    "Locks the current channel so that only people with elevated permissions can talk in it.";
  requiredPermissions: PermissionResolvable = ["MANAGE_CHANNELS"];

  async handle(interaction: CommandInteraction) {
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

    if (interaction.channel.type !== "GUILD_TEXT") {
      await interaction.reply({
        content: `This type of channel (\`${interaction.channel.type}\`) can't be locked.`,
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel;
    const roles = await interaction.guild.roles.fetch();

    for (const [_, role] of roles) {
      if (channel.permissionsFor(role).has(Permissions.FLAGS.SEND_MESSAGES)) {
        await channel.permissionOverwrites.create(role, {
          SEND_MESSAGES: role.permissions.has(
            Permissions.FLAGS.MANAGE_CHANNELS
          ),
        });
      }
    }

    const embed = new MessageEmbed()
      .setColor("RED")
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
  requiredPermissions: PermissionResolvable = ["MANAGE_CHANNELS"];

  async handle(interaction: CommandInteraction) {
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

    if (interaction.channel.type !== "GUILD_TEXT") {
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
        role.permissions.has(Permissions.FLAGS.SEND_MESSAGES) &&
        !channel.permissionsFor(role).has(Permissions.FLAGS.SEND_MESSAGES)
      ) {
        await channel.permissionOverwrites.delete(role);
      }
    }

    const embed = new MessageEmbed()
      .setColor("GREEN")
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
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to dungeon.",
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

    const role = (await getDungeonRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");

    if (member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User is already in the dungeon.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.add(role, reason ?? undefined);

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(
        `${userMention(member.user.id)} has been thrown into the dungeon.`
      )
      .setImage("https://i.ibb.co/xzVTSXC/ezgif-com-optimize-2.gif");

    if (reason) {
      embed.addField("Reason", reason);
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
  requiredPermissions: PermissionResolvable = ["KICK_MEMBERS"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "user",
      description: "The user you want to dungeon.",
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

    const role = (await getDungeonRoleForGuild(interaction.guild)) as Role;
    const member = interaction.options.getMember("user", true) as GuildMember;
    const reason = interaction.options.getString("reason");

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "User isn't in the dungeon.",
        ephemeral: true,
      });
      return;
    }

    await member.roles.remove(role, reason ?? undefined);

    const embed = new MessageEmbed()
      .setColor("GREEN")
      .setDescription(
        `${userMention(member.user.id)} has been released from the dungeon.`
      );

    if (reason) {
      embed.addField("Reason", reason);
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

    const embed = new MessageEmbed()
      .setColor("RED")
      .setDescription(`${bold(member.user.tag)} has been banned.`)
      .addField("Reason", reason);

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
    new MuteCommand(),
    new UnmuteCommand(),
    new BlacklistCommand(),
    new UnblacklistCommand(),
    new LockChannelCommand(),
    new UnlockChannelCommand(),
    new DungeonCommand(),
    new UndungeonCommand(),
  ],
  handlers: {
    guildMemberAdd: [handleGuildMemberAdd],
  },
  cronJobs: [new CronJob("0 * * * * *", clearExpiredMutes)],
};

export default ModerationModule;
