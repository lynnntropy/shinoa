import {
  CommandInteraction,
  DMChannel,
  Message,
  NewsChannel,
  PartialMessage,
  TextChannel,
} from "discord.js";
import logger from "../logger";

export const logInteraction = async (interaction: CommandInteraction) => {
  if (!interaction.isCommand()) return;

  if (interaction.guild !== null) {
    const channel = interaction.channel;
    const member = await interaction.guild.members.fetch(interaction.user.id);

    logger.info(
      `Command /${interaction.commandName} used by ` +
        (member.nickname
          ? `${member.nickname} (${member.user.username}#${member.user.discriminator}) `
          : `${member.user.username}#${member.user.discriminator} `) +
        `in ${interaction.guild.name} -> #${(channel as TextChannel).name}`
    );

    return;
  }

  if (interaction.channel && interaction.channel.type === "DM") {
    logger.info(
      `Command /${interaction.commandName} used by ` +
        `${interaction.user.username}#${interaction.user.discriminator} ` +
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

  if (message.channel.type === "GUILD_TEXT") {
    const channel = message.channel as TextChannel | NewsChannel;
    const guild = (channel as TextChannel).guild;

    logger.debug(
      `[${guild.name} -> #${channel.name}] [type ${message.type}] ` +
        (message.member!.nickname
          ? `${message.member!.nickname} (${message.author.username}#${
              message.author.discriminator
            }) `
          : `${message.author.username}#${message.author.discriminator} `) +
        message.content
    );

    return;
  }

  if (message.channel.type === "DM") {
    const channel = message.channel as DMChannel;

    logger.debug(
      `[${channel.recipient.username}#${channel.recipient.discriminator} (DM)] [type ${message.type}] ` +
        message.content
    );

    return;
  }

  logger.warn(
    `Failed to log message ID ${message.id} with unsupported channel type '${message.channel.type}'.`
  );
};
