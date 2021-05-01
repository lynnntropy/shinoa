import { commands as botAdministrationCommands } from "./modules/botAdministration";
import { commands as miscCommands } from "./modules/misc";
import { commands as moderationCommands } from "./modules/moderation";
import { commands as funCommands } from "./modules/fun";
import { Command } from "./types";

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
      commands: [
        ...botAdministrationCommands,
        ...miscCommands,
        ...moderationCommands,
        ...funCommands,
      ],
    },
  },
};

export default config;
