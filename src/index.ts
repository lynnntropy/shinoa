import logger from "./logger";
import { Client } from "discord.js";
import config from "./config";
import { GatewayServer, SlashCreator } from "slash-create";

const client = new Client();

const slashCreator = new SlashCreator({
  applicationID: config.applicationId,
  token: config.environment.TOKEN,
});

slashCreator.withServer(
  // @ts-ignore we know INTERACTION_CREATE is a valid event
  new GatewayServer((handler) => client.ws.on("INTERACTION_CREATE", handler))
);

// TODO
// slashCreator.registerCommands

client.on("ready", () => {
  logger.info(
    `Connected to Discord as ${client.user.username}#${client.user.discriminator}!`
  );
});

logger.info("Starting client...");
client.login(config.environment.TOKEN);
