import logger from "./logger";
import environment from "./environment";
import client from "./client";

const main = async () => {
  logger.info("Starting client...");
  await client.login(environment.TOKEN);
};

main();
