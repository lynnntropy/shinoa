import { logInteraction as logInteractionUpstream } from "../../util/log.ts";
import { CommandInput } from "../../types.ts";

const logInteraction = (interaction: CommandInput) =>
  logInteractionUpstream(interaction);

export default logInteraction;
