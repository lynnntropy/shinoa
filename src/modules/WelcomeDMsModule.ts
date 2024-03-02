import { Guild, GuildMember, MessageCreateOptions } from "discord.js";
import config from "../config";
import { EventHandler, Module } from "../internal/types";

export type GuildWelcomeDMsConfig = {
  enabled: true;
  messageBuilder: (guild: Guild, member: GuildMember) => MessageCreateOptions;
};

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  const guildConfig = config.guilds[member.guild.id].welcomeDMs;

  if (!guildConfig?.enabled) {
    return;
  }

  const message = guildConfig.messageBuilder(member.guild, member);

  await member.send(message);
};

const WelcomeDMsModule: Module = {
  commands: [],
  handlers: {
    guildMemberAdd: [handleGuildMemberAdd],
  },
};

export default WelcomeDMsModule;
