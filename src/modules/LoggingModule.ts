import { MessageEmbed, TextBasedChannels } from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import logger from "../logger";
import { detailedDiff } from "deep-object-diff";
import { isEmpty } from "lodash";

const defaultChannels = {
  moderation: "mod-logs",
  messages: "message-logs",
  voice: "voice-logs",
  joins: "join-logs",
  userUpdates: "user-logs",
  keywords: "keyword-logs",
};

const handleReady: EventHandler<"ready"> = async () => {
  logger.info("Booting up logging module...");

  for (const guildId in config.guilds) {
    const guildConfig = config.guilds[guildId];
    const guild = client.guilds.resolve(guildId);

    if (!guildConfig.logging) {
      continue;
    }

    logger.debug(`Initializing logging channels for guild ${guild.name}...`);

    // If we have a category ID, we'll look for
    // the channels from `defaultChannels` there
    if (guildConfig.logging?.categoryId) {
      // Check if the category contains the right channels and
      // create them if not
      for (const key in defaultChannels) {
        const channelName: string = defaultChannels[key];

        guild.channels.cache.find(
          (c) =>
            c.parentId === guildConfig.logging.categoryId &&
            c.name === channelName
        ) ??
          (await guild.channels.create(channelName, {
            parent: guildConfig.logging.categoryId,
          }));
      }

      return;
    }
  }
};

const handleMessageUpdate: EventHandler<"messageUpdate"> = async (
  oldMessage,
  newMessage
) => {
  if (!getLoggingConfigForGuild(newMessage.guildId)) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(
    newMessage.guildId,
    "messages"
  );

  const embed = new MessageEmbed()
    .setColor("YELLOW")
    .setTitle(
      `${newMessage.author.username}#${newMessage.author.discriminator} edited their message`
    )
    .addField("Before", oldMessage.cleanContent)
    .addField("After", newMessage.cleanContent)
    .setURL(newMessage.url);

  loggingChannel.send({ embeds: [embed] });
};

const handleMessageDelete: EventHandler<"messageDelete"> = async (message) => {
  if (!getLoggingConfigForGuild(message.guildId)) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(message.guildId, "messages");

  const embed = new MessageEmbed()
    .setColor("RED")
    .setTitle(
      `${message.author.username}#${message.author.discriminator}'s message was deleted`
    )
    .setDescription(message.cleanContent);

  await loggingChannel.send({ embeds: [embed] });
};

const handleVoiceStateUpdate: EventHandler<"voiceStateUpdate"> = async (
  oldState,
  newState
) => {
  if (!getLoggingConfigForGuild(newState.guild.id)) {
    return;
  }

  // We're only interested in channel changes
  if (oldState.channelId === newState.channelId) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(newState.guild.id, "voice");

  const joined = !!newState.channelId;

  const embed = new MessageEmbed().setAuthor(
    `${newState.member.user.username}#${newState.member.user.discriminator}`,
    newState.member.user.avatarURL()
  );

  if (joined) {
    embed.setColor("GREEN");
    embed.setDescription(`Joined voice channel: **${newState.channel.name}**`);
  } else {
    embed.setColor("RED");
    embed.setDescription(`Left voice channel: **${oldState.channel.name}**`);
  }

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  if (!getLoggingConfigForGuild(member.guild.id)) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(member.guild.id, "joins");

  const embed = new MessageEmbed()
    .setColor("GREEN")
    .setAuthor(
      `${member.user.username}#${member.user.discriminator}`,
      member.user.avatarURL()
    )
    .setDescription("Member joined");

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberRemove: EventHandler<"guildMemberRemove"> = async (
  member
) => {
  if (!getLoggingConfigForGuild(member.guild.id)) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(member.guild.id, "joins");

  const embed = new MessageEmbed()
    .setColor("RED")
    .setAuthor(
      `${member.user.username}#${member.user.discriminator}`,
      member.user.avatarURL()
    )
    .setDescription("Member left");

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberUpdate: EventHandler<"guildMemberUpdate"> = async (
  oldMember,
  newMember
) => {
  if (!getLoggingConfigForGuild(newMember.guild.id)) {
    return;
  }

  const loggingChannel = getDefaultLoggingChannel(
    newMember.guild.id,
    "userUpdates"
  );

  const diff: any = detailedDiff(oldMember, newMember);

  let embedBody = ``;

  embedBody =
    `${embedBody}` +
    `\nOriginal data\n\`\`\`\n` +
    JSON.stringify(oldMember, undefined, 2) +
    `\n\`\`\``;

  if (!isEmpty(diff.added)) {
    embedBody =
      `${embedBody}` +
      `\nProperties added\n\`\`\`\n` +
      JSON.stringify(diff.added, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.deleted)) {
    embedBody =
      `${embedBody}` +
      `\nProperties deleted\n\`\`\`\n` +
      JSON.stringify(diff.deleted, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.updated)) {
    embedBody =
      `${embedBody}` +
      `\nProperties updated\n\`\`\`\n` +
      JSON.stringify(diff.updated, undefined, 2) +
      `\n\`\`\``;
  }

  embedBody = embedBody.trim();

  const embed = new MessageEmbed()
    .setColor("BLURPLE")
    .setAuthor(
      `${newMember.user.username}#${newMember.user.discriminator}`,
      newMember.user.avatarURL()
    )
    .setTitle("Member updated")
    .setDescription(embedBody);

  await loggingChannel.send({ embeds: [embed] });
};

const getLoggingConfigForGuild = (id: string) => config.guilds[id]?.logging;

const getDefaultLoggingChannel = (
  guildId: string,
  eventType: keyof typeof defaultChannels
) => {
  const guildConfig = config.guilds[guildId];
  const guild = client.guilds.resolve(guildId);

  return guild.channels.cache.find(
    (c) =>
      c.parentId === guildConfig.logging.categoryId &&
      c.name === defaultChannels[eventType]
  ) as TextBasedChannels;
};

const LoggingModule: Module = {
  commands: [],
  handlers: {
    ready: [handleReady],
    messageUpdate: [handleMessageUpdate],
    messageDelete: [handleMessageDelete],
    voiceStateUpdate: [handleVoiceStateUpdate],
    guildMemberAdd: [handleGuildMemberAdd],
    guildMemberRemove: [handleGuildMemberRemove],
    guildMemberUpdate: [handleGuildMemberUpdate],
  },
};

export default LoggingModule;
