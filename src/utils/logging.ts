import {
  ChannelType,
  CommandInteraction,
  DMChannel,
  Message,
  NewsChannel,
  PartialMessage,
  TextChannel,
} from "discord.js";
import logger from "../logger";
import { buildUsernameString } from "./strings";

export const logInteraction = async (interaction: CommandInteraction) => {
  if (!interaction.isCommand()) return;

  if (interaction.guild !== null) {
    const channel = interaction.channel;
    const member = await interaction.guild.members.fetch(interaction.user.id);

    logger.info(
      `Command /${interaction.commandName} used by ` +
        (member.nickname
          ? `${member.nickname} (${buildUsernameString(member.user)}) `
          : `${buildUsernameString(member.user)} `) +
        `in ${interaction.guild.name} -> #${(channel as TextChannel).name}`
    );

    return;
  }

  if (interaction.channel && interaction.channel.type === ChannelType.DM) {
    logger.info(
      `Command /${interaction.commandName} used by ` +
        `${buildUsernameString(interaction.user)} ` +
        `in DM`
    );

    return;
  }
};

export const logMessage = async (message: Message | PartialMessage) => {
  if (message.partial) {
    message = await message.fetch();
  }

  logger.trace(message);

  if (message.channel.type === ChannelType.GuildText) {
    const channel = message.channel as TextChannel | NewsChannel;
    const guild = (channel as TextChannel).guild;

    logger.debug(
      `[${guild.name} -> #${channel.name}] [type ${message.type}] ` +
        (message.member!.nickname
          ? `${message.member!.nickname} (${buildUsernameString(
              message.author
            )}) `
          : `${buildUsernameString(message.author)} `) +
        message.content
    );

    return;
  }

  if (message.channel.type === ChannelType.DM) {
    const channel = message.channel as DMChannel;

    logger.debug(
      `[${buildUsernameString(channel.recipient)} (DM)] [type ${
        message.type
      }] ` + message.content
    );

    return;
  }

  logger.warn(
    `Failed to log message ID ${message.id} with unsupported channel type '${message.channel.type}'.`
  );
};
