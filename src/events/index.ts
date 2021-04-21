import { GatewayDispatchEvents } from "discord-api-types/v8";
import logger from "../logger";
import { EventHandler } from "../types";
import handleInteraction from "./interactionCreate.ts/handleInteraction";
import synchronizeCommands from "./ready/synchronizeCommands";

type Handlers = {
  [event: string]: EventHandler<unknown>[];
};

const handlers: Handlers = {
  [GatewayDispatchEvents.Ready]: [
    async () => logger.info("Connected to Discord gateway!"),
    synchronizeCommands,
  ],
  [GatewayDispatchEvents.InteractionCreate]: [handleInteraction],
};

export default handlers;
