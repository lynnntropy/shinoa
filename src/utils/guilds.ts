import { ChannelType, Guild, TextChannel } from "discord.js";
import config from "../config";

export const getGeneralMessageChannelForGuild = async (
  guild: Guild
): Promise<TextChannel> => {
  const channelId = config.guilds[guild.id]?.generalMessageChannelId;

  if (channelId) {
    const channel = await guild.channels.fetch(channelId);

    if (channel === null) {
      throw Error(
        `Configured general message channel ID ${channelId} doesn't exist.`
      );
    }

    if (channel.type !== ChannelType.GuildText) {
      throw Error(
        `Configured general message channel ID ${channelId} isn't a text channel.`
      );
    }

    return channel as TextChannel;
  }

  return (
    (guild.channels.cache.find(
      (c) =>
        c.name.toLowerCase().trim() === "general" &&
        c.type === ChannelType.GuildText
    ) as TextChannel) ?? guild.systemChannel
  );
};
