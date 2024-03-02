import { userMention } from "@discordjs/builders";
import {
  ChannelType,
  Guild,
  GuildMember,
  MessageCreateOptions,
  PartialGuildMember,
  Role,
  Snowflake,
} from "discord.js";
import config from "../config";
import emitter from "../emitter";
import { EventHandler, Module } from "../internal/types";
import { getGeneralMessageChannelForGuild } from "../utils/guilds";
import { buildUsernameString } from "../utils/strings";

export type GuildJoinLeaveMessagesConfig = {
  enabled: true;
  channelId?: string;

  joinMessageBuilder?: (
    guild: Guild,
    member: GuildMember
  ) => MessageCreateOptions;
  leaveMessageBuilder?: (
    guild: Guild,
    member: GuildMember | PartialGuildMember
  ) => MessageCreateOptions;
} & (
  | {
      mode: "default";
    }
  | {
      mode: "role";
      roleId: Snowflake;
    }
);

const defaultJoinMessageBuilder = (
  guild: Guild,
  member: GuildMember
): MessageCreateOptions => {
  return {
    content: `Welcome to ${guild.name}, ${userMention(member.user.id)}!`,
  };
};

const defaultLeaveMessageBuilder = (
  _: Guild,
  member: GuildMember | PartialGuildMember
): MessageCreateOptions => {
  return {
    content: `Bye, ${
      member.user ? buildUsernameString(member.user) : member.displayName
    }!`,
  };
};

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  const guildConfig = config.guilds[member.guild.id].joinLeaveMessages;

  if (!guildConfig?.enabled) {
    return;
  }

  if (guildConfig.mode !== "default") {
    return;
  }

  await sendJoinMessage(member);
};

const handleGuildMemberRemove: EventHandler<"guildMemberRemove"> = async (
  member
) => {
  const guildConfig = config.guilds[member.guild.id].joinLeaveMessages;

  if (!guildConfig?.enabled) {
    return;
  }

  if (
    guildConfig.mode === "role" &&
    !member.partial &&
    !member.roles.cache.has(guildConfig.roleId)
  ) {
    return;
  }

  await sendLeaveMessage(member);
};

const handleGuildMemberUpdate: EventHandler<"guildMemberUpdate"> = async (
  oldMember,
  newMember
) => {
  const guildConfig = config.guilds[newMember.guild.id].joinLeaveMessages;

  if (!guildConfig?.enabled) {
    return;
  }

  if (guildConfig.mode !== "role") {
    return;
  }

  if (oldMember.partial) {
    oldMember = await oldMember.fetch();
  }

  const addedRoles: Role[] = [
    ...newMember.roles.cache
      .filter((r) => oldMember.roles.cache.get(r.id) === undefined)
      .values(),
  ];

  if (!addedRoles.find((r) => r.id === guildConfig.roleId)) {
    return;
  }

  await sendJoinMessage(newMember);
};

const sendJoinMessage = async (member: GuildMember) => {
  const channel = config.guilds[member.guild.id].joinLeaveMessages?.channelId
    ? await member.guild.channels.fetch(
        config.guilds[member.guild.id].joinLeaveMessages?.channelId as string
      )
    : await getGeneralMessageChannelForGuild(member.guild);

  if (channel === null) {
    throw Error(`Configured join/leave message channel not found.`);
  }

  if (channel.type !== ChannelType.GuildText) {
    throw Error(`Configured join/leave message channel is not a text channel.`);
  }

  const builder =
    config.guilds[member.guild.id].joinLeaveMessages?.joinMessageBuilder ??
    defaultJoinMessageBuilder;

  const message = builder(member.guild, member);

  await channel.send(message);

  emitter.emit("announceMemberJoinedEvent", member);
};

const sendLeaveMessage = async (member: GuildMember | PartialGuildMember) => {
  const channel = config.guilds[member.guild.id].joinLeaveMessages?.channelId
    ? await member.guild.channels.fetch(
        config.guilds[member.guild.id].joinLeaveMessages?.channelId as string
      )
    : await getGeneralMessageChannelForGuild(member.guild);

  if (channel === null) {
    throw Error(`Configured join/leave message channel not found.`);
  }

  if (channel.type !== ChannelType.GuildText) {
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
    guildMemberUpdate: [handleGuildMemberUpdate],
  },
};

export default JoinLeaveMessagesModule;
