import { commands } from "./modules";
import environment from "./environment";
import { Command } from "./internal/command";
export { handlers } from "./modules";

export interface Config {
  ownerId: string;
  applicationId: string;
  globalCommands: Command[];
  guilds: {
    [key: string]: {
      generalMessageChannelId?: string;
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
      moderation?: {
        mutedRoleId?: string;
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
          quotes: {
            quoteManagerRoleId: "614118005416263762",
          },
          logging: {
            categoryId: "619980910527512577",
          },
        },
      }
    : {
        // Vesko's Workshop
        ["161167668131397642"]: {
          commands,
          quotes: {
            quoteManagerRoleId: "843467841696170036",
          },
          logging: {
            categoryId: "891738612314554398",
          },
        },
      },
};

export default config;
