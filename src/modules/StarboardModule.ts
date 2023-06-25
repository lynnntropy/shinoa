import {
  GuildChannel,
  Message,
  MessageEmbedOptions,
  MessageOptions,
  PartialMessage,
  TextChannel,
} from "discord.js";
import { EventHandler, Module } from "../internal/types";
import config from "../config";
import prisma from "../prisma";
import client from "../client";
import logger from "../logger";
import * as mime from "mime-types";
import { bold, hyperlink } from "@discordjs/builders";
import { buildUsernameString } from "../utils/strings";

const DEFAULT_THRESHOLD = 5;
const STARBOARD_EMOJI = "⭐";

const handleMessageReactionAdd: EventHandler<"messageReactionAdd"> = async (
  reaction
) => handleMessageUpdate(reaction.message);
const handleMessageReactionRemove: EventHandler<
  "messageReactionRemove"
> = async (reaction) => handleMessageUpdate(reaction.message);
const handleMessageReactionRemoveEmoji: EventHandler<
  "messageReactionRemoveEmoji"
> = async (reaction) => handleMessageUpdate(reaction.message);
const handleMessageReactionRemoveAll: EventHandler<
  "messageReactionRemoveAll"
> = async (message) => handleMessageUpdate(message);

const handleMessageUpdate = async (message: Message | PartialMessage) => {
  if (!message.guildId) return;

  const guildId = message.guildId;

  if (!config.guilds[guildId].starboard?.enabled) return;

  const starboardConfig = config.guilds[guildId].starboard!;
  const threshold = starboardConfig.threshold ?? DEFAULT_THRESHOLD;

  if (starboardConfig.channelWhitelist) {
    const channel = message.channel as GuildChannel;

    // since the guild has a channel whitelist configured, the message
    // needs to either be in a channel that's directly on the whitelist,
    // _or_ a channel that's a child of a channel that's whitelisted
    // and has `includeChildren` set to true

    const channelWhitelistEntry = starboardConfig.channelWhitelist.find(
      (e) => e.id === channel.id
    );

    const parentWhitelistEntry = starboardConfig.channelWhitelist.find(
      (e) => e.includeChildren && e.id === channel.parentId
    );

    if (!channelWhitelistEntry && !parentWhitelistEntry) {
      return;
    }
  }

  if (message.partial) {
    message = await message.fetch();
  }

  const users = await message.reactions.resolve(STARBOARD_EMOJI)?.users.fetch();
  const starCount = users?.size ?? 0;

  logger.debug(
    `[StarboardModule] ` +
      `Reactions changed for message ID ${message.id}: ` +
      JSON.stringify(message.reactions.valueOf())
  );

  const starboardItem = await prisma.starboardItem.findUnique({
    where: { messageId: message.id },
  });

  if (starboardItem) {
    const channel = await resolveStarboardChannel(guildId);

    if (starCount < threshold) {
      // This message _was_ on the starboard until now, but
      // doesn't qualify anymore

      await channel.messages.delete(starboardItem.starboardMessageId);

      await prisma.starboardItem.delete({
        where: {
          id: starboardItem.id,
        },
      });

      return;
    }

    // re-render the starboard message to update the star count
    await channel.messages.edit(
      starboardItem.starboardMessageId,
      await buildStarboardMessage(message)
    );

    return;
  }

  if (starCount >= threshold) {
    // This message just qualified for the starboard!

    const channel = await resolveStarboardChannel(guildId);
    const starboardMessage = await channel.send(
      await buildStarboardMessage(message)
    );

    await prisma.starboardItem.create({
      data: {
        guildId,
        messageId: message.id,
        starboardMessageId: starboardMessage.id,
      },
    });
  }
};

const resolveStarboardChannel = async (
  guildId: string
): Promise<TextChannel> => {
  const guild = await client.guilds.fetch(guildId);
  const channelId = config.guilds[guildId].starboard?.channelId;

  if (channelId) {
    const channel = await guild.channels.fetch(channelId);

    if (channel === null) {
      throw Error(
        `Configured starboard channel ID ${channelId} doesn't exist.`
      );
    }

    if (!channel.isText()) {
      throw Error(
        `Configured starboard channel ID ${channelId} isn't a text channel.`
      );
    }

    return channel as TextChannel;
  }

  const channel = guild.channels.cache.find(
    (c) => c.name.toLowerCase().trim() === "starboard" && c.isText()
  ) as TextChannel | undefined;

  if (!channel) {
    throw Error(
      `Couldn't resolve a starboard channel for guild ID ${guildId}.`
    );
  }

  return channel;
};

const buildStarboardMessage = async (
  originalMessage: Message
): Promise<Pick<MessageOptions, "embeds">> => {
  if (!originalMessage.guildId) {
    throw Error("Message isn't in a guild.");
  }

  const users = await originalMessage.reactions
    .resolve(STARBOARD_EMOJI)
    ?.users.fetch();
  const starCount = users?.size ?? 0;

  const embed: MessageEmbedOptions = {
    author: {
      name: originalMessage.author.tag,
      iconURL: `https://cdn.discordapp.com/avatars/${originalMessage.author.id}/${originalMessage.author.avatar}`,
    },
    description: originalMessage.content,
    timestamp: new Date(originalMessage.createdAt as unknown as string),
    fields: [],
    footer: {
      text: `Message sent in #${(originalMessage.channel as TextChannel).name}`,
    },
  };

  try {
    const member = await (
      await client.guilds.fetch(originalMessage.guildId)
    ).members.fetch(originalMessage.author.id);

    embed.author = {
      name: member.nickname ?? buildUsernameString(member.user),
      iconURL: `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}`,
    };
  } catch (e) {
    logger.debug(
      `Couldn't fetch a member for user ID ${originalMessage.author.id}.`
    );
  }

  const image = originalMessage.attachments.find((a) =>
    (mime.lookup(a.url) || "unknown").startsWith("image/")
  );
  const video = originalMessage.attachments.find((a) =>
    (mime.lookup(a.url) || "unknown").startsWith("video/")
  );

  if (image !== undefined) {
    embed.image = { url: image.url };
  }

  if (video !== undefined) {
    embed.fields!.push({ name: "Video", value: video.url, inline: false });
  }

  embed.description =
    `${STARBOARD_EMOJI} ${bold(starCount.toString())}` +
    "\n\n" +
    (embed.description ? `${embed.description}\n\n` : "") +
    hyperlink("🔗 Jump to message", originalMessage.url);
  embed.description = embed.description.trim();

  return { embeds: [embed] };
};

const StarboardModule: Module = {
  commands: [],
  handlers: {
    messageReactionAdd: [handleMessageReactionAdd],
    messageReactionRemove: [handleMessageReactionRemove],
    messageReactionRemoveEmoji: [handleMessageReactionRemoveEmoji],
    messageReactionRemoveAll: [handleMessageReactionRemoveAll],
  },
};

export default StarboardModule;
