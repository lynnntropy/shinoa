import { commands } from "./modules";
import environment from "./environment";
import { Command } from "./internal/command";
import { channelMention, userMention } from "@discordjs/builders";
import { GuildRolesConfig } from "./modules/RolesModule";
import { GuildJoinLeaveMessagesConfig } from "./modules/JoinLeaveMessagesModule";
import { MemberCounterConfig } from "./modules/MemberCounterModule";
import { GuildWelcomeDMsConfig } from "./modules/WelcomeDMsModule";
export { handlers } from "./modules";

export interface Config {
  ownerId: string;
  applicationId: string;
  globalCommands: Command[];
  guilds: {
    [key: string]: {
      generalMessageChannelId?: string;
      joinLeaveMessages?: GuildJoinLeaveMessagesConfig;
      welcomeDMs?: GuildWelcomeDMsConfig;
      commands?: Command[];
      quotes?: {
        quoteManagerRoleId?: string;
      };
      stickers?: {
        stickerManagerRoleId?: string;
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
      roles?: GuildRolesConfig;
      memberCounter?: MemberCounterConfig;
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
          generalMessageChannelId: "191709045646688256",
          joinLeaveMessages: {
            enabled: true,
            mode: "role",
            roleId: "708824304099262478",
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
          welcomeDMs: {
            enabled: true,
            messageBuilder: (_, member) => ({
              content:
                `**Link Start!** Welcome to r/SwordArtOnline, ` +
                `${userMention(member.user.id)}! ` +
                `Please notice #welcome-chan for information on rules, roles, access to the server, and a mandatory gameplay tutorial. And enjoy your stay.` +
                `\n\n` +
                `https://discord.com/channels/191709045646688256/708772331526422597/759465132149047348`,
            }),
          },
          quotes: {
            quoteManagerRoleId: "614118005416263762",
          },
          stickers: {
            stickerManagerRoleId: "614118005416263762",
          },
          logging: {
            categoryId: "619980910527512577",
          },
          starboard: {
            enabled: true,
            threshold: 5,
            channelWhitelist: [
              "191977603526033408",
              "851936718839218197",
              "928093879230668820",
            ],
          },
          moderation: {
            mutedRoleId: "201454485669675008",
          },
          roles: {
            messages: [
              {
                id: "759465178700972033",
                channelId: "708772331526422597",
                type: "reaction",
                options: [
                  {
                    roleId: "708824304099262478",
                    emoji: {
                      id: null,
                      name: "✅",
                    },
                  },
                ],
              },

              // vanity roles
              {
                id: "759465203879510056",
                channelId: "708772331526422597",
                type: "reaction",
                options: [
                  {
                    roleId: "758123449804914698",
                    emoji: {
                      id: "290536476951707650",
                      name: "asunaBun",
                    },
                  },
                  {
                    roleId: "334017799976648704",
                    emoji: {
                      id: "586984541076586526",
                      name: "KiriTeaFancy",
                    },
                  },
                  {
                    roleId: "334017950711283712",
                    emoji: {
                      id: "949770829607108648",
                      name: "leafa",
                    },
                  },
                  {
                    roleId: "334017962451140608",
                    emoji: {
                      id: "726180144309600276",
                      name: "SinonWow",
                    },
                  },
                  {
                    roleId: "334017964229656579",
                    emoji: {
                      id: "586984522462003235",
                      name: "YuukiV",
                    },
                  },
                  {
                    roleId: "399995831144415242",
                    emoji: {
                      id: "432586508881362945",
                      name: "LLENNpeh",
                    },
                  },
                  {
                    roleId: "472441118835867668",
                    emoji: {
                      id: "586984610173288460",
                      name: "YunaSmile",
                    },
                  },
                  {
                    roleId: "334017965940801556",
                    emoji: {
                      id: "613099893749317662",
                      name: "aREEEEEEsu",
                    },
                  },
                  {
                    roleId: "417534074320584704",
                    emoji: {
                      id: "592518729884106857",
                      name: "Argolaff",
                    },
                  },
                ],
              },

              // event roles
              {
                id: "759465220086956072",
                channelId: "708772331526422597",
                type: "reaction",
                options: [
                  {
                    roleId: "592125727785222160",
                    emoji: {
                      id: null,
                      name: "🎤",
                    },
                  },
                  {
                    roleId: "472403071675138061",
                    emoji: {
                      id: "230098348734939136",
                      name: "kiritonut",
                    },
                  },
                  {
                    roleId: "615698972320989194",
                    emoji: {
                      id: null,
                      name: "🎥",
                    },
                  },
                  {
                    roleId: "612121841242472448",
                    emoji: {
                      id: "619689814362685470",
                      name: "SplitRoom",
                    },
                  },
                  {
                    roleId: "845353249154138182",
                    emoji: {
                      id: null,
                      name: "📚",
                    },
                  },
                  {
                    roleId: "631138850898575362",
                    emoji: {
                      id: null,
                      name: "📰",
                    },
                  },
                  {
                    roleId: "634950270287216655",
                    emoji: {
                      id: null,
                      name: "🖌️",
                    },
                  },
                  {
                    roleId: "670089220425121803",
                    emoji: {
                      id: "672099680271859723",
                      name: "Blockgame",
                    },
                  },
                  {
                    roleId: "682612730120634403",
                    emoji: {
                      id: null,
                      name: "🖊️",
                    },
                  },
                  {
                    roleId: "708769098179281007",
                    emoji: {
                      id: "810651067687108659",
                      name: "Smash",
                    },
                  },
                  {
                    roleId: "825391966530437200",
                    emoji: {
                      id: null,
                      name: "🎨",
                    },
                  },
                  {
                    roleId: "788072977546608671",
                    emoji: {
                      id: "667749382115950637",
                      name: "AsunaYayHyper",
                    },
                  },
                ],
              },
            ],
            stickyLevelRoles: {
              enabled: true,
              roles: [
                {
                  level: 5,
                  roleId: "849163414450339871",
                },
                {
                  level: 10,
                  roleId: "793720044060016650",
                },
              ],
            },
          },
          memberCounter: {
            enabled: true,
            channelId: "756816167209009213",
            buildChannelName: (count) => `Memebers: ${count}`,
          },
        },
      }
    : {
        // Vesko's Workshop
        ["161167668131397642"]: {
          commands,
          joinLeaveMessages: {
            enabled: true,
            mode: "default",
            // mode: "role",
            // roleId: "949715319772033074",
          },
          welcomeDMs: {
            enabled: true,
            messageBuilder: (_, member) => ({
              content:
                `**Link Start!** Welcome to r/SwordArtOnline, ` +
                `${userMention(member.user.id)}! ` +
                `Please notice #welcome-chan for information on rules, roles, access to the server, and a mandatory gameplay tutorial. And enjoy your stay.` +
                `\n\n` +
                `https://discord.com/channels/191709045646688256/708772331526422597/759465132149047348`,
            }),
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
          roles: {
            messages: [
              {
                id: "949715094638579742",
                channelId: "161167668131397642",
                type: "reaction",
                options: [
                  {
                    roleId: "949715319772033074",
                    emoji: {
                      id: null,
                      name: "😌",
                    },
                  },
                  {
                    roleId: "949715383861006336",
                    emoji: {
                      id: "730534917645008946",
                      name: "AngryTurtle",
                    },
                  },
                ],
              },
              {
                id: "949720895730122783",
                channelId: "161167668131397642",
                type: "select",
                options: [
                  {
                    roleId: "949715319772033074",
                    description: "Description",
                    emoji: {
                      id: null,
                      name: "😌",
                    },
                  },
                  {
                    roleId: "949715383861006336",
                    description: "Description",
                    emoji: {
                      id: "730534917645008946",
                      name: "AngryTurtle",
                    },
                  },
                  {
                    roleId: "949721438267514951",
                    description: "Description",
                  },
                ],
              },
            ],
            stickyLevelRoles: {
              enabled: true,
              roles: [
                {
                  level: 0,
                  roleId: "962394011316936804",
                },
                {
                  level: 10,
                  roleId: "962394060855853096",
                },
              ],
            },
          },
          memberCounter: {
            enabled: true,
            channelId: "840326539791171634",
            buildChannelName: (count) => `Memebers: ${count}`,
          },
        },
      },
};

export default config;
