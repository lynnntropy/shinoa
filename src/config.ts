import { getEnvironmentVariableOrThrow } from "./utils/config";

const config = {
  environment: {
    TOKEN: getEnvironmentVariableOrThrow("TOKEN"),
  },
};

export default config;
