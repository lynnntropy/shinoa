import { Command } from "./types";
import { commands } from "./modules";
export { handlers } from "./modules";

interface Config {
  ownerId: string;
  applicationId: string;
  isProduction: boolean;
  globalCommands: Command[];
  guilds: {
    [key: string]: { commands?: Command[] };
  };
}

const config: Config = {
  ownerId: "98225142064250880",
  applicationId:
    process.env.NODE_ENV === "production"
      ? "833659808187678771"
      : "838072375063871559",
  isProduction: process.env.NODE_ENV === "production",
  globalCommands: [],
  guilds: {
    // Vesko's Workshop
    ["161167668131397642"]: {
      commands,
    },
    // /r/SAO
    ["191709045646688256"]: {
      commands,
    },
  },
};

export default config;
