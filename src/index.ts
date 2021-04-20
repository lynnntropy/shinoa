import logger from "./logger";
import { Client } from "discord.js";
import config from "./config";

const client = new Client();

client.on("ready", () => {
  logger.info(
    `Connected to Discord gateway as ${client.user.username}#${client.user.discriminator}!`
  );
});

logger.info("Starting client...");
client.login(config.environment.TOKEN);
