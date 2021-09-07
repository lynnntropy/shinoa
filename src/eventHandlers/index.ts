import logger from "../logger";
import { logInteraction, logMessage } from "../utils/logging";
import handleInteraction from "./interactionCreate/handleInteraction";
import synchronizeCommands from "./ready/synchronizeCommands";
import { handlers as moduleHandlers } from "../config";
import { mergeHandlerCollections } from "../utils/modules";
import setStatus from "./ready/setStatus";
import { HandlerCollection } from "../internal/types";

let handlers: HandlerCollection = {
  ready: [
    async () => logger.info("Connected to Discord gateway!"),
    setStatus,
    synchronizeCommands,
  ],
  interactionCreate: [logInteraction, handleInteraction],
  messageCreate: [logMessage],
};

handlers = mergeHandlerCollections([handlers, moduleHandlers]);

export default handlers;
