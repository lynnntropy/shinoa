import { GatewayDispatchEvents } from "discord-api-types/v8";
import logger from "../logger";
import { EventHandler } from "../types";
import { logInteraction, logMessage } from "../utils/logging";
import handleInteraction from "./interactionCreate/handleInteraction";
import synchronizeCommands from "./ready/synchronizeCommands";

type Handlers = {
  [event: string]: EventHandler<unknown>[];
};

const handlers: Handlers = {
  [GatewayDispatchEvents.Ready]: [
    async () => logger.info("Connected to Discord gateway!"),
    synchronizeCommands,
  ],
  [GatewayDispatchEvents.InteractionCreate]: [
    logInteraction,
    handleInteraction,
  ],
  [GatewayDispatchEvents.MessageCreate]: [logMessage],
};

export default handlers;
