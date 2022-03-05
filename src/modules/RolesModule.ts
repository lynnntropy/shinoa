import { MessageActionRow, MessageSelectMenu, Snowflake } from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import logger from "../logger";

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

// todo respond to select interactions
// todo respond to reactions

const RolesModule: Module = {
  commands: [],
  handlers: {
    ready: [handleReady],
  },
};

export default RolesModule;
