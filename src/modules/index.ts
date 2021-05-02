import { commands as botAdministrationCommands } from "./botAdministration";
import { commands as miscCommands } from "./misc";
import { commands as moderationCommands } from "./moderation";
import { commands as funCommands } from "./fun";

export const commands = [
  ...botAdministrationCommands,
  ...miscCommands,
  ...moderationCommands,
  ...funCommands,
];
