import { SayCommand } from "./modules/botAdministration";
import { PingCommand } from "./modules/misc";
import { KickCommand } from "./modules/moderation";
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
    commands: [new SayCommand(), new PingCommand(), new KickCommand()],
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
