import { getEnvironmentVariableOrThrow } from "./utils/config";

interface GuildConfig {
  [key: string]: { commands?: unknown };
}

const isProduction = process.env.NODE_ENV === "production";

const applicationId = "833659808187678771";

const environment = {
  TOKEN: getEnvironmentVariableOrThrow("TOKEN"),
};

const guilds: GuildConfig = {
  // Vesko's Workshop
  ["161167668131397642"]: {},
};

const config = {
  isProduction,
  applicationId,
  environment,
  guilds,
};

export default config;
