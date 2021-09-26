import { MessageEmbed, TextBasedChannels } from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import logger from "../logger";

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

  loggingChannel.send({ embeds: [embed] });
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
  },
};

export default LoggingModule;
