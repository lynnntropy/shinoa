import "reflect-metadata";
import logger from "./logger";
import environment from "./environment";
import client from "./client";
import initializeDatabase from "./database";

const main = async () => {
  await initializeDatabase();

  logger.info("Starting client...");
  await client.login(environment.TOKEN);
};

main();
