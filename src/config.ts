import { commands } from "./modules";
import environment from "./environment";
import { Command } from "./internal/command";
export { handlers } from "./modules";

interface Config {
  ownerId: string;
  applicationId: string;
  globalCommands: Command[];
  guilds: {
    [key: string]: {
      commands?: Command[];
      quotes?: {
        quoteManagerRoleId?: string;
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
        },
      }
    : {
        // Vesko's Workshop
        ["161167668131397642"]: {
          commands,
          quotes: {
            quoteManagerRoleId: "843467841696170036",
          },
        },
      },
};

export default config;
