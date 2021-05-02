import {
  APIApplicationCommandOption,
  APIInteraction,
  APIMessage,
  ApplicationCommandOptionType,
  GatewayDispatchEvents,
  InteractionResponseType,
} from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import { PermissionResolvable, Snowflake, TextChannel } from "discord.js";
import client from "../../client";
import { respondToInteraction } from "../../discord/api";
import logger from "../../logger";
import prisma from "../../prisma";
import { Command, Module } from "../../types";

const MAXIMUM_MESSAGE_LENGTH = 64;

// tl;dr people can post only single words, they can't edit them
// (pretty sure that's not doable with a bot tho), and a period counts as a word

// If they post 2 consecutive messages the 2nd one gets deleted

// And uh, I'd say a 64-character limit on words, that's about it

// Just that the bot needs to delete anything that's more than one word or too long

// Compile the entire channel into a single text file.
// I will do manual formatting and spelling/grammar correction later on anyways,
// I just want a basic file in the end is all.

class StorytimeCommand implements Command {
  name = "storytime";
  description = "Storytime mode management commands.";
  requiredPermissions: PermissionResolvable = ["MANAGE_CHANNELS"];
  options: APIApplicationCommandOption[] = [
    {
      name: "enable",
      description: "Enable storytime mode for this channel.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
    {
      name: "disable",
      description: "Disable storytime mode for this channel.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
  ];

  async handle(interaction: APIInteraction) {
    if (!isGuildInteraction(interaction)) {
      throw new Error("This command can only be used in a guild.");
    }

    const subcommand = interaction.data.options[0].name as "enable" | "disable";

    const key = getSettingKey(interaction.channel_id);

    if (subcommand === "enable") {
      const kv = { key, value: true };
      await prisma.keyValueItem.upsert({
        where: { key },
        update: kv,
        create: kv,
      });

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Enabled storytime mode for this channel.` },
      });
    }

    if (subcommand === "disable") {
      const kv = { key, value: false };
      await prisma.keyValueItem.upsert({
        where: { key },
        update: kv,
        create: kv,
      });

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Disabled storytime mode for this channel.` },
      });
    }
  }
}

const handleMessage = async (message: APIMessage) => {
  if (!(await isEnabledForChannel(message.channel_id))) {
    return;
  }

  const channel = client.channels.cache.get(message.channel_id);

  if (!channel.isText()) {
    logger.warn(
      `Storytime mode is enabled for non-text channel ID ${message.channel_id}.`
    );
    return;
  }

  if (!(await isMessageAllowed(channel as TextChannel, message))) {
    await channel.messages.delete(message.id);
  }
};

const handleMessageUpdate = async (message: APIMessage) => {
  if (!(await isEnabledForChannel(message.channel_id))) {
    return;
  }

  // Someone edited a message in a storytime channel, which isn't allowed,
  // so we'll just delete it

  const channel = client.channels.cache.get(message.channel_id);

  if (!channel.isText()) {
    logger.warn(
      `Storytime mode is enabled for non-text channel ID ${message.channel_id}.`
    );
    return;
  }

  await channel.messages.delete(message.id);
};

const isMessageAllowed = async (
  channel: TextChannel,
  message: APIMessage
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

const StorytimeModule: Module = {
  commands: [new StorytimeCommand()],
  handlers: {
    [GatewayDispatchEvents.MessageCreate]: [handleMessage],
    [GatewayDispatchEvents.MessageUpdate]: [handleMessageUpdate],
  },
};

export default StorytimeModule;
