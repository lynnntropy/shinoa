import { getEnvironmentVariableOrThrow } from "./utils/config";

export default {
  TOKEN: getEnvironmentVariableOrThrow("TOKEN"),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
};
