import logger from "./logger";
import environment from "./environment";
import client from "./client";

logger.info("Starting client...");
client.login(environment.TOKEN);
