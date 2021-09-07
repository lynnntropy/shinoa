import {
  Message,
  PermissionResolvable,
  Snowflake,
  TextChannel,
} from "discord.js";
import client from "../../client";
import { Command, CommandSubCommand } from "../../internal/command";
import { EventHandler, Module } from "../../internal/types";
import logger from "../../logger";
import prisma from "../../prisma";

const MAXIMUM_MESSAGE_LENGTH = 64;
const EXPORT_BATCH_SIZE = 100;

class StorytimeCommand extends Command {
  name = "storytime";
  description = "Storytime mode management commands.";
  requiredPermissions: PermissionResolvable = ["MANAGE_CHANNELS"];
  subCommands: CommandSubCommand[] = [
    {
      name: "enable",
      description: "Enable storytime mode for this channel.",

      async handle(interaction) {
        const key = getSettingKey(interaction.channel.id);

        const kv = { key, value: true };
        await prisma.keyValueItem.upsert({
          where: { key },
          update: kv,
          create: kv,
        });

        await interaction.reply("Enabled storytime mode for this channel.");
      },
    },
    {
      name: "disable",
      description: "Disable storytime mode for this channel.",

      async handle(interaction) {
        const key = getSettingKey(interaction.channel.id);

        const kv = { key, value: false };
        await prisma.keyValueItem.upsert({
          where: { key },
          update: kv,
          create: kv,
        });

        await interaction.reply("Disabled storytime mode for this channel.");
      },
    },
    {
      name: "export",
      description: "Export all messages so far as a text file.",

      async handle(interaction) {
        const channel = client.channels.cache.get(interaction.channel.id);

        await interaction.deferReply();

        const story = await exportMessagesToString(channel as TextChannel);

        await interaction.editReply({
          files: [{ name: "storytime.txt", attachment: story }],
        });
      },
    },
  ];
}

const handleMessage: EventHandler<"messageCreate"> = async (
  message: Message
) => {
  if (!(await isEnabledForChannel(message.channel.id))) {
    return;
  }

  const channel = client.channels.cache.get(message.channel.id);

  if (!channel.isText()) {
    logger.warn(
      `Storytime mode is enabled for non-text channel ID ${message.channel.id}.`
    );
    return;
  }

  if (!(await isMessageAllowed(channel as TextChannel, message))) {
    await channel.messages.delete(message.id);
  }
};

const handleMessageUpdate: EventHandler<"messageUpdate"> = async (
  message: Message
) => {
  if (!(await isEnabledForChannel(message.channel.id))) {
    return;
  }

  // Someone edited a message in a storytime channel, which isn't allowed,
  // so we'll just delete it

  const channel = client.channels.cache.get(message.channel.id);

  if (!channel.isText()) {
    logger.warn(
      `Storytime mode is enabled for non-text channel ID ${message.channel.id}.`
    );
    return;
  }

  await channel.messages.delete(message.id);
};

const isMessageAllowed = async (
  channel: TextChannel,
  message: Message
): Promise<boolean> => {
  if (message.author.id === client.user.id) {
    return true;
  }

  const previousMessage = (
    await channel.messages.fetch({ limit: 1, before: message.id })
  ).first();

  if (previousMessage.author.id === message.author.id) {
    return false;
  }

  if (message.content.trim().includes(" ")) {
    return false;
  }

  if (message.content.trim().includes("\n")) {
    return false;
  }

  if (message.content.length > MAXIMUM_MESSAGE_LENGTH) {
    return false;
  }

  return true;
};

const isEnabledForChannel = async (id: Snowflake): Promise<boolean> => {
  const key = getSettingKey(id);
  return (
    (await prisma.keyValueItem.findUnique({ where: { key } }))?.value === true
  );
};

const getSettingKey = (id: Snowflake) => `channels.${id}.storytime.enabled`;

const exportMessagesToString = async (
  channel: TextChannel
): Promise<string> => {
  let messages: Message[] = [];
  let cursor: Snowflake | null = null;

  while (true) {
    const batch = await channel.messages.fetch({
      limit: EXPORT_BATCH_SIZE,
      before: cursor,
    });

    logger.debug(`Fetched batch of ${batch.size} messages.`);

    cursor = batch.last()?.id;

    messages.push(...batch.values());

    if (batch.size < EXPORT_BATCH_SIZE) {
      break;
    }
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  messages = messages.filter((m) => m.author.id !== client.user.id);

  let combinedContent = "";
  for (const message of messages) {
    let atom = message.content;
    atom = atom.trim();
    if (combinedContent.length > 0 && atom.match(/^\w/)) {
      atom = ` ${atom}`;
    }
    combinedContent += atom;
  }

  return combinedContent;
};

const StorytimeModule: Module = {
  commands: [new StorytimeCommand()],
  handlers: {
    messageCreate: [handleMessage],
    messageUpdate: [handleMessageUpdate],
  },
};

export default StorytimeModule;
