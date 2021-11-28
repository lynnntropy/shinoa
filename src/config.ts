import { commands } from "./modules";
import environment from "./environment";
import { Command } from "./internal/command";
import {
  Guild,
  GuildMember,
  MessageOptions,
  PartialGuildMember,
} from "discord.js";
import { channelMention, userMention } from "@discordjs/builders";
export { handlers } from "./modules";

export interface Config {
  ownerId: string;
  applicationId: string;
  globalCommands: Command[];
  guilds: {
    [key: string]: {
      generalMessageChannelId?: string;
      joinLeaveMessages?: {
        enabled: true;
        channelId?: string;
        joinMessageBuilder?: (
          guild: Guild,
          member: GuildMember
        ) => MessageOptions;
        leaveMessageBuilder?: (
          guild: Guild,
          member: GuildMember | PartialGuildMember
        ) => MessageOptions;
      };
      commands?: Command[];
      quotes?: {
        quoteManagerRoleId?: string;
      };
      logging?: {
        categoryId?: string;
        channelIds?: {
          moderation?: string;
          messages?: string;
          voice?: string;
          joins?: string;
          userUpdates?: string;
          keywords?: string;
        };
      };
      starboard?: {
        enabled: true;
        threshold?: number;
        channelId?: string;
        channelWhitelist?: string[];
      };
      moderation?: {
        mutedRoleId?: string;
        dungeonRoleId?: string;
      };
    };
  };
}

const config: Config = {
  ownerId: "98225142064250880",
  applicationId: environment.isProduction
    ? "833659808187678771"
    : "838072375063871559",
  globalCommands: commands,
  guilds: environment.isProduction
    ? {
        // Vesko's Workshop
        ["161167668131397642"]: {
          commands,
          quotes: {
            quoteManagerRoleId: "843467841696170036",
          },
        },

        // /r/SwordArtOnline
        ["191709045646688256"]: {
          joinLeaveMessages: {
            enabled: true,
            joinMessageBuilder: (guild, member) => ({
              content:
                `**Link Start!** Welcome to ${guild.name}, ${userMention(
                  member.user.id
                )}! ` +
                `Please notice ${channelMention("708772331526422597")} ` +
                `for information on rules, roles, and a mandatory gameplay tutorial, and enjoy your stay.`,
            }),
            leaveMessageBuilder: (guild, member) => ({
              content: `${
                member.user?.tag ?? member.displayName
              } found the logout button and has returned to real life... A fate worse than death.`,
            }),
          },
          quotes: {
            quoteManagerRoleId: "614118005416263762",
          },
          logging: {
            categoryId: "619980910527512577",
          },
          moderation: {
            mutedRoleId: "201454485669675008",
          },
        },
      }
    : {
        // Vesko's Workshop
        ["161167668131397642"]: {
          commands,
          joinLeaveMessages: {
            enabled: true,
          },
          quotes: {
            quoteManagerRoleId: "843467841696170036",
          },
          logging: {
            categoryId: "891738612314554398",
          },
          starboard: {
            enabled: true,
            threshold: 1,
          },
        },
      },
};

export default config;
