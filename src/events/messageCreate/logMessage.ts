import { discordeno } from "../../../deps.ts";
import { logMessage as logMessageUpstream } from "../../util/log.ts";

const logMessage = (message: discordeno.Message) => logMessageUpstream(message);

export default logMessage;
