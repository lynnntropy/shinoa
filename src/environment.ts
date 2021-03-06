import { getEnvironmentVariableOrThrow } from "./utils/config";

export default {
  isProduction: process.env.NODE_ENV === "production",
  TOKEN: getEnvironmentVariableOrThrow("TOKEN"),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@db/shinoa",
  WEEB_SH_API_KEY: getEnvironmentVariableOrThrow("WEEB_SH_API_KEY"),
  AMARI_BOT_API_TOKEN: getEnvironmentVariableOrThrow("AMARI_BOT_API_TOKEN"),
};
