import {
  isDMInteraction,
  isGuildInteraction,
} from "discord-api-types/utils/v8";
import { APIInteraction, APIMessage } from "discord-api-types/v8";
import { DMChannel, PartialGroupDMChannel, TextChannel } from "discord.js";
// import { TextChannel } from "discord.js";
import client from "../client";
import logger from "../logger";

export const logInteraction = async (input: APIInteraction) => {
  if (isGuildInteraction(input)) {
    const guild = await client.guilds.fetch(input.guild_id);
    const channel = await client.channels.fetch(input.channel_id);

    logger.info(
      `Command /${input.data.name} used by ` +
        (input.member.nick
          ? `${input.member.nick} (${input.member.user.username}#${input.member.user.discriminator}) `
          : `${input.member.user.username}#${input.member.user.discriminator} `) +
        `in ${guild.name} -> #${(channel as TextChannel).name}`
    );

    return;
  }

  if (isDMInteraction(input)) {
    logger.info(
      `Command /${input.data.name} used by ` +
        `${input.user.username}#${input.user.discriminator} ` +
        `in DM`
    );

    return;
  }
};

export const logMessage = async (input: APIMessage) => {
  logger.trace(input);

  const channel = await client.channels.fetch(input.channel_id);

  if (channel.type === "text") {
    const textChannel = channel as TextChannel;
    const guild = textChannel.guild;

    logger.debug(
      `[${guild.name} -> #${textChannel.name}] [type ${input.type}] ` +
        (input.member.nick
          ? `${input.member.nick} (${input.author.username}#${input.author.discriminator}) `
          : `${input.author.username}#${input.author.discriminator} `) +
        input.content
    );

    return;
  }

  if (channel.type === "dm") {
    const dmChannel = channel as DMChannel;

    logger.debug(
      `[${dmChannel.recipient.username}#${dmChannel.recipient.discriminator} (DM)] [type ${input.type}] ` +
        input.content
    );

    return;
  }

  if (channel.type === "group") {
    const groupDmChannel = channel as PartialGroupDMChannel;

    logger.debug(
      `[${groupDmChannel.name} (Group DM)] [type ${input.type}] ` +
        (input.member.nick
          ? `${input.member.nick} (${input.author.username}#${input.author.discriminator}) `
          : `${input.author.username}#${input.author.discriminator} `) +
        input.content
    );

    return;
  }

  logger.warn(
    `Failed to log message ID ${input.id} with unknown channel type '${channel.type}'.`
  );
};
