import {
  ButtonInteraction,
  GuildMember,
  Message,
  MessageActionRow,
  MessageButton,
  MessageReaction,
  MessageSelectMenu,
  Snowflake,
} from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import appLogger from "../logger";
import * as Sentry from "@sentry/node";
import { bold } from "@discordjs/builders";
import { CronJob } from "cron";
import amariBot from "../amaribot";
import { User as AmariUser } from "amaribot.js";

const logger = appLogger.child({ module: "RolesModule" });

export type GuildRolesMessageConfig =
  | {
      id: Snowflake;
      channelId: Snowflake;
    } & (
      | {
          type: "select";
          options: {
            roleId: Snowflake;
            description: string;
            emoji?: {
              name: string;
              id: Snowflake | null;
            };
          }[];
        }
      | {
          type: "reaction";
          options: {
            roleId: Snowflake;
            emoji: {
              name: string;
              id: Snowflake | null;
            };
          }[];
        }
    );

export type GuildStickyLevelRolesConfig = {
  enabled: true;
  roles: {
    level: number;
    roleId: Snowflake;
  }[];
};

export interface GuildRolesConfig {
  messages?: GuildRolesMessageConfig[];
  stickyLevelRoles?: GuildStickyLevelRolesConfig;
}

const initializeMessage = async (
  guildId: string,
  config: GuildRolesMessageConfig
) => {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(config.channelId);

  if (!channel) {
    throw Error(`Channel ID ${config.channelId} not found.`);
  }

  if (!channel.isText()) {
    throw Error(
      `Channel ID ${config.channelId} is not a text channel (channel type is ${channel.type}).`
    );
  }

  const message = await channel.messages.fetch(config.id);

  if (config.type === "reaction") {
    for (const option of config.options) {
      if (
        option.emoji.id &&
        !message.reactions.cache.find((r) => r.emoji.id === option.emoji.id)
      ) {
        await message.react(option.emoji.id);
      } else if (
        !message.reactions.cache.find((r) => r.emoji.name === option.emoji.name)
      ) {
        await message.react(option.emoji.name);
      }
    }

    return;
  }

  if (config.type === "select") {
    await guild.roles.fetch();
    const row = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId("shinoa_roles_module_menu")
        .setPlaceholder("Open to show available roles")
        .addOptions(
          config.options.map((o) => ({
            value: o.roleId,
            label: guild.roles.cache.get(o.roleId)!.name,
            description: o.description,
            emoji: o.emoji?.id ?? o.emoji?.name,
          }))
        )
    );

    await message.edit({
      content: "Choose a role to assign or remove it from yourself.",
      components: [row],
    });

    return;
  }
};

const refreshStickyLevelRoles = async () => {
  logger.debug(`Refreshing sticky level roles...`);

  for (const guildId in config.guilds) {
    const guildRolesConfig = config.guilds[guildId].roles;

    if (!guildRolesConfig) {
      continue;
    }

    if (guildRolesConfig.stickyLevelRoles?.enabled) {
      await refreshStickyLevelRolesForGuild(guildId);
    }
  }
};

const refreshStickyLevelRolesForGuild = async (guildId: string) => {
  logger.debug(`Refreshing sticky level roles for guild ID ${guildId}...`);

  const configuredRoles =
    config.guilds[guildId]?.roles?.stickyLevelRoles?.roles;

  if (!configuredRoles) {
    throw Error("No sticky role config found for guild.");
  }

  const guild = await client.guilds.fetch(guildId);

  const amariUsers: AmariUser[] = [];

  let page = 1;

  while (true) {
    const leaderboard = await amariBot.getGuildLeaderboard(guildId, { page });
    amariUsers.push(...leaderboard.data);

    logger.debug(
      { guildId },
      `Fetched ${amariUsers.length} of ${leaderboard.totalCount} AmariBot users.`
    );

    if (amariUsers.length >= leaderboard.totalCount) {
      break;
    }

    page++;
  }

  logger.debug({ guildId }, `Finished fetching AmariBot leaderboard.`);

  for (const amariUser of amariUsers) {
    const member = await guild.members.fetch({
      user: amariUser.id,
      force: true,
    });

    for (const role of configuredRoles) {
      if (
        amariUser.level !== undefined &&
        amariUser.level >= role.level &&
        !member.roles.cache.has(role.roleId)
      ) {
        logger.debug(
          { roleConfig: role, amariUser, member },
          `User has reached Amari level ${role.level}, assigning sticky role.`
        );

        await member.roles.add(role.roleId);
      }
    }
  }
};

// utilities

const getMessageConfigForReaction = async (reaction: MessageReaction) => {
  if (!reaction.message.inGuild()) {
    return null;
  }

  const guildRolesConfig = config.guilds[reaction.message.guildId!].roles;

  if (!guildRolesConfig || !guildRolesConfig.messages) {
    return null;
  }

  const message = guildRolesConfig.messages.find(
    (m) => m.id === reaction.message.id && m.type === "reaction"
  );

  if (!message || message.type !== "reaction") {
    return null;
  }

  return message;
};

// event handlers

const handleReady: EventHandler<"ready"> = async () => {
  logger.debug("Booting up RolesModule...");

  for (const guildId in config.guilds) {
    const guildRolesConfig = config.guilds[guildId].roles;

    if (!guildRolesConfig) {
      continue;
    }

    if (guildRolesConfig.messages) {
      for (const message of guildRolesConfig.messages) {
        logger.debug(`Initializing message ID ${message.id}...`);

        try {
          await initializeMessage(guildId, message);
        } catch (e) {
          logger.error(
            { messageConfig: message, err: e },
            "Failed to initialize message."
          );
        }
      }
    }
  }

  refreshStickyLevelRoles();
};

const handleMessageReactionAdd: EventHandler<"messageReactionAdd"> = async (
  reaction,
  user
) => {
  if (user.bot) {
    return;
  }

  if (reaction.partial) {
    reaction = await reaction.fetch();
  }

  const message = await getMessageConfigForReaction(reaction);

  if (!message) {
    return;
  }

  const guild = await client.guilds.fetch(reaction.message.guildId!);
  const member = await guild.members.fetch(user.id);

  const option =
    message.options.find(
      (o) => o.emoji.id && o.emoji.id === reaction.emoji.id
    ) ?? message.options.find((o) => o.emoji.name === reaction.emoji.name);

  if (!option) {
    Sentry.captureException(
      Error("Failed to match this reaction with an option."),
      { contexts: { reaction: reaction as any, user: user as any } }
    );
    return;
  }

  await member.roles.add(option.roleId, "User self-assigned role");

  return;
};

const handleMessageReactionRemove: EventHandler<
  "messageReactionRemove"
> = async (reaction, user) => {
  if (user.bot) {
    return;
  }

  if (reaction.partial) {
    reaction = await reaction.fetch();
  }

  const message = await getMessageConfigForReaction(reaction);

  if (!message) {
    return;
  }

  const guild = await client.guilds.fetch(reaction.message.guildId!);
  const member = await guild.members.fetch(user.id);

  const option =
    message.options.find(
      (o) => o.emoji.id && o.emoji.id === reaction.emoji.id
    ) ?? message.options.find((o) => o.emoji.name === reaction.emoji.name);

  if (!option) {
    Sentry.captureException(
      Error("Failed to match this reaction with an option."),
      { contexts: { reaction: reaction as any, user: user as any } }
    );
    return;
  }

  await member.roles.remove(option.roleId, "User self-unassigned role");

  return;
};

const handleInteractionCreate: EventHandler<"interactionCreate"> = async (
  interaction
) => {
  if (!interaction.inGuild()) {
    return;
  }

  if (!interaction.isSelectMenu()) {
    return;
  }

  const guildRolesConfig = config.guilds[interaction.guildId].roles;

  if (!guildRolesConfig || !guildRolesConfig.messages) {
    return;
  }

  const message = guildRolesConfig.messages.find(
    (m) => m.id === interaction.message.id && m.type === "select"
  );

  if (!message || message.type !== "select") {
    return;
  }

  const member = interaction.member as GuildMember;
  const guild = await client.guilds.fetch(interaction.guildId);

  const option = message.options.find(
    (o) => o.roleId === interaction.values[0]
  );

  if (!option) {
    Sentry.captureException(
      Error("Failed to match this interaction with an option."),
      { contexts: { interaction: interaction as any } }
    );
    return;
  }

  const role = await guild.roles.fetch(option.roleId);
  const hasRole = member.roles.cache.has(option.roleId);

  if (!role) {
    throw Error(`Role ID ${option.roleId} not found.`);
  }

  const row = new MessageActionRow();

  if (!hasRole) {
    row.addComponents(
      new MessageButton()
        .setCustomId("continue")
        .setLabel("Yes, continue")
        .setStyle("PRIMARY")
    );
  } else {
    row.addComponents(
      new MessageButton()
        .setCustomId("continue")
        .setLabel("Yes, continue")
        .setStyle("DANGER")
    );
  }

  row.addComponents(
    new MessageButton()
      .setCustomId("cancel")
      .setLabel("Cancel")
      .setStyle("SECONDARY")
  );

  await interaction.reply({
    ephemeral: true,
    content: !hasRole
      ? `Do you want to assign yourself the role ${bold(role.name)}?`
      : `Do you want to remove the role ${bold(role.name)} from yourself?`,
    components: [row],
  });

  const reply = (await interaction.fetchReply()) as Message;

  const filter = (i: ButtonInteraction) => {
    i.deferUpdate();
    return i.user.id === interaction.user.id;
  };

  try {
    const replyInteraction = await reply.awaitMessageComponent({
      filter,
      componentType: "BUTTON",
      time: 300_000, // 5 minutes
    });

    if (replyInteraction.customId === "continue") {
      if (!hasRole) {
        await member.roles.add(option.roleId, "User self-assigned role");
        await interaction.editReply({
          content: `Role ${bold(role.name)} successfully assigned.`,
          components: [],
        });
      } else {
        await member.roles.remove(option.roleId, "User self-unassigned role");
        await interaction.editReply({
          content: `Role ${bold(role.name)} successfully removed.`,
          components: [],
        });
      }

      return;
    }

    await interaction.editReply({
      content: "Role operation cancelled.",
      components: [],
    });
  } catch (e) {
    logger.warn(e);
  }
};

const RolesModule: Module = {
  commands: [],
  handlers: {
    ready: [handleReady],
    messageReactionAdd: [handleMessageReactionAdd],
    messageReactionRemove: [handleMessageReactionRemove],
    interactionCreate: [handleInteractionCreate],
  },
  cronJobs: [new CronJob("0 */5 * * * *", refreshStickyLevelRoles)],
};

export default RolesModule;
