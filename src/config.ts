import { commands as botAdministrationCommands } from "./modules/botAdministration";
import { commands as miscCommands } from "./modules/misc";
import { commands as moderationCommands } from "./modules/moderation";
import { Command } from "./types";

interface GuildConfig {
  [key: string]: { commands?: Command[] };
}

const isProduction = process.env.NODE_ENV === "production";

const applicationId = "833659808187678771";

const globalCommands: Command[] = [];

const guilds: GuildConfig = {
  // Vesko's Workshop
  ["161167668131397642"]: {
    commands: [
      ...botAdministrationCommands,
      ...miscCommands,
      ...moderationCommands,
    ],
  },
};

const config = {
  ownerId: "98225142064250880",
  isProduction,
  applicationId,
  globalCommands,
  guilds,
};

export default config;
