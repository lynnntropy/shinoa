import {
  APIApplicationCommandOption,
  APIInteraction,
  APIMessage,
  ApplicationCommandOptionType,
  GatewayDispatchEvents,
  InteractionResponseType,
} from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import {
  Message,
  PermissionResolvable,
  Snowflake,
  TextChannel,
} from "discord.js";
import FormData = require("form-data");
import client from "../../client";
import {
  editOriginalInteractionResponse,
  respondToInteraction,
} from "../../discord/api";
import logger from "../../logger";
import prisma from "../../prisma";
import { Command, Module } from "../../types";

const MAXIMUM_MESSAGE_LENGTH = 64;
const EXPORT_BATCH_SIZE = 100;

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
    {
      name: "export",
      description: "Export all messages so far as a text file.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
  ];

  async handle(interaction: APIInteraction) {
    if (!isGuildInteraction(interaction)) {
      throw new Error("This command can only be used in a guild.");
    }

    const subcommand = interaction.data.options[0].name as
      | "enable"
      | "disable"
      | "export";

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

    if (subcommand === "export") {
      const channel = client.channels.cache.get(interaction.channel_id);

      await respondToInteraction(interaction, {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
      });

      const story = await exportMessagesToString(channel as TextChannel);

      const form = new FormData();
      form.append("file", story, { filename: "storytime.txt" });
      form.append("payload_json", JSON.stringify({ content: "" }), {
        contentType: "application/json",
      });

      await editOriginalInteractionResponse(interaction, form);
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
    const batch = await channel.messages.fetch(
      { limit: EXPORT_BATCH_SIZE, before: cursor },
      true,
      true
    );

    logger.debug(`Fetched batch of ${batch.size} messages.`);

    cursor = batch.last()?.id;

    messages.push(...batch.array());

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
    [GatewayDispatchEvents.MessageCreate]: [handleMessage],
    [GatewayDispatchEvents.MessageUpdate]: [handleMessageUpdate],
  },
};

export default StorytimeModule;
