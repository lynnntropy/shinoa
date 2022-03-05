import {
  MessageActionRow,
  MessageReaction,
  MessageSelectMenu,
  Snowflake,
} from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import logger from "../logger";
import * as Sentry from "@sentry/node";

export type GuildRolesMessageConfig =
  | {
      id: Snowflake;
      channelId: Snowflake;
    } & (
      | {
          type: "select";
          options: {
            roleId: Snowflake;
            description: string;
            emoji?: {
              name: string;
              id: Snowflake | null;
            };
          }[];
        }
      | {
          type: "reaction";
          options: {
            roleId: Snowflake;
            emoji: {
              name: string;
              id: Snowflake | null;
            };
          }[];
        }
    );

export interface GuildRolesConfig {
  messages: GuildRolesMessageConfig[];
}

const handleReady: EventHandler<"ready"> = async () => {
  logger.debug("Booting up RolesModule...");

  for (const guildId in config.guilds) {
    const guildRolesConfig = config.guilds[guildId].roles;

    if (!guildRolesConfig) {
      continue;
    }

    for (const message of guildRolesConfig.messages) {
      logger.debug(`[RolesModule] Initializing message ID ${message.id}...`);
      await initializeMessage(guildId, message);
    }
  }
};

const initializeMessage = async (
  guildId: string,
  config: GuildRolesMessageConfig
) => {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(config.channelId);

  if (!channel) {
    throw Error(`Channel ID ${config.channelId} not found.`);
  }

  if (!channel.isText()) {
    throw Error(
      `Channel ID ${config.channelId} is not a text channel (channel type is ${channel.type}).`
    );
  }

  const message = await channel.messages.fetch(config.id);

  if (config.type === "reaction") {
    for (const option of config.options) {
      if (
        option.emoji.id &&
        !message.reactions.cache.find((r) => r.emoji.id === option.emoji.id)
      ) {
        await message.react(option.emoji.id);
      } else if (
        !message.reactions.cache.find((r) => r.emoji.name === option.emoji.name)
      ) {
        await message.react(option.emoji.name);
      }
    }

    return;
  }

  if (config.type === "select") {
    await guild.roles.fetch();
    const row = new MessageActionRow().addComponents(
      new MessageSelectMenu()
        .setCustomId("shinoa_roles_module_menu")
        .setPlaceholder("Choose a role to assign or unassign it from yourself.")
        .addOptions(
          config.options.map((o) => ({
            value: o.roleId,
            label: guild.roles.cache.get(o.roleId)!.name,
            description: o.description,
            emoji: o.emoji?.id ?? o.emoji?.name,
          }))
        )
    );

    await message.edit({ content: null, components: [row] });

    return;
  }
};

// respond to reactions

const handleMessageReactionAdd: EventHandler<"messageReactionAdd"> = async (
  reaction,
  user
) => {
  if (reaction.partial) {
    reaction = await reaction.fetch();
  }

  const message = await getMessageConfigForReaction(reaction);

  if (!message) {
    return;
  }

  const guild = await client.guilds.fetch(reaction.message.guildId!);
  const member = await guild.members.fetch(user.id);

  const option =
    message.options.find(
      (o) => o.emoji.id && o.emoji.id === reaction.emoji.id
    ) ?? message.options.find((o) => o.emoji.name === reaction.emoji.name);

  if (!option) {
    Sentry.captureException(
      Error("Failed to match this reaction with an option."),
      { contexts: { reaction: reaction as any, user: user as any } }
    );
    return;
  }

  await member.roles.add(option.roleId, "User self-assigned role");

  return;
};

const handleMessageReactionRemove: EventHandler<
  "messageReactionRemove"
> = async (reaction, user) => {
  if (reaction.partial) {
    reaction = await reaction.fetch();
  }

  const message = await getMessageConfigForReaction(reaction);

  if (!message) {
    return;
  }

  const guild = await client.guilds.fetch(reaction.message.guildId!);
  const member = await guild.members.fetch(user.id);

  const option =
    message.options.find(
      (o) => o.emoji.id && o.emoji.id === reaction.emoji.id
    ) ?? message.options.find((o) => o.emoji.name === reaction.emoji.name);

  if (!option) {
    Sentry.captureException(
      Error("Failed to match this reaction with an option."),
      { contexts: { reaction: reaction as any, user: user as any } }
    );
    return;
  }

  await member.roles.remove(option.roleId, "User self-unassigned role");

  return;
};

const getMessageConfigForReaction = async (reaction: MessageReaction) => {
  if (!reaction.message.inGuild()) {
    return null;
  }

  const guildRolesConfig = config.guilds[reaction.message.guildId!].roles;

  if (!guildRolesConfig) {
    return null;
  }

  const message = guildRolesConfig.messages.find(
    (m) => m.id === reaction.message.id && m.type === "reaction"
  );

  if (!message || message.type !== "reaction") {
    return null;
  }

  return message;
};

// todo respond to select interactions

const RolesModule: Module = {
  commands: [],
  handlers: {
    ready: [handleReady],
    messageReactionAdd: [handleMessageReactionAdd],
    messageReactionRemove: [handleMessageReactionRemove],
  },
};

export default RolesModule;
