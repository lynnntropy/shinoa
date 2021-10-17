import { userMention } from "@discordjs/builders";
import {
  Guild,
  GuildMember,
  MessageOptions,
  PartialGuildMember,
} from "discord.js";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import { getGeneralMessageChannelForGuild } from "../utils/guilds";

const defaultJoinMessageBuilder = (
  guild: Guild,
  member: GuildMember
): MessageOptions => {
  return {
    content: `Welcome to ${guild.name}, ${userMention(member.user.id)}!`,
  };
};

const defaultLeaveMessageBuilder = (
  _: Guild,
  member: GuildMember | PartialGuildMember
): MessageOptions => {
  return {
    content: `Bye, ${member.user?.tag ?? member.displayName}!`,
  };
};

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  if (!config.guilds[member.guild.id].joinLeaveMessages?.enabled) {
    return;
  }

  const channel = config.guilds[member.guild.id].joinLeaveMessages?.channelId
    ? await member.guild.channels.fetch(
        config.guilds[member.guild.id].joinLeaveMessages?.channelId as string
      )
    : await getGeneralMessageChannelForGuild(member.guild);

  if (channel === null) {
    throw Error(`Configured join/leave message channel not found.`);
  }

  if (!channel.isText()) {
    throw Error(`Configured join/leave message channel is not a text channel.`);
  }

  const builder =
    config.guilds[member.guild.id].joinLeaveMessages?.joinMessageBuilder ??
    defaultJoinMessageBuilder;

  const message = builder(member.guild, member);

  await channel.send(message);
};

const handleGuildMemberRemove: EventHandler<"guildMemberRemove"> = async (
  member
) => {
  if (!config.guilds[member.guild.id].joinLeaveMessages?.enabled) {
    return;
  }

  const channel = config.guilds[member.guild.id].joinLeaveMessages?.channelId
    ? await member.guild.channels.fetch(
        config.guilds[member.guild.id].joinLeaveMessages?.channelId as string
      )
    : await getGeneralMessageChannelForGuild(member.guild);

  if (channel === null) {
    throw Error(`Configured join/leave message channel not found.`);
  }

  if (!channel.isText()) {
    throw Error(`Configured join/leave message channel is not a text channel.`);
  }

  const builder =
    config.guilds[member.guild.id].joinLeaveMessages?.leaveMessageBuilder ??
    defaultLeaveMessageBuilder;

  const message = builder(member.guild, member);

  await channel.send(message);
};

const JoinLeaveMessagesModule: Module = {
  commands: [],
  handlers: {
    guildMemberAdd: [handleGuildMemberAdd],
    guildMemberRemove: [handleGuildMemberRemove],
  },
};

export default JoinLeaveMessagesModule;
