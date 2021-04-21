import {
  RESTPostAPIApplicationCommandsJSONBody,
  RESTPostAPIApplicationGuildCommandsJSONBody,
} from "discord-api-types/v8";
import { Command } from "../types";

export const buildApplicationCommandBodyFromCommand = (
  command: Command
):
  | RESTPostAPIApplicationCommandsJSONBody
  | RESTPostAPIApplicationGuildCommandsJSONBody => {
  return {
    name: command.name,
    description: command.description,
    options: command.options,
    default_permission: command.defaultPermission,
  };
};
