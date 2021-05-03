import { GatewayDispatchEvents } from "discord-api-types/v8";
import logger from "../logger";
import { HandlerCollection } from "../types";
import { logInteraction, logMessage } from "../utils/logging";
import handleInteraction from "./interactionCreate/handleInteraction";
import synchronizeCommands from "./ready/synchronizeCommands";
import { handlers as moduleHandlers } from "../config";
import { mergeHandlerCollections } from "../utils/modules";
import setStatus from "./ready/setStatus";

let handlers: HandlerCollection = {
  [GatewayDispatchEvents.Ready]: [
    async () => logger.info("Connected to Discord gateway!"),
    setStatus,
    synchronizeCommands,
  ],
  [GatewayDispatchEvents.InteractionCreate]: [
    logInteraction,
    handleInteraction,
  ],
  [GatewayDispatchEvents.MessageCreate]: [logMessage],
};

handlers = mergeHandlerCollections([handlers, moduleHandlers]);

export default handlers;
