import {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
  RESTPostAPIApplicationGuildCommandsJSONBody,
} from "discord-api-types/v8";
import { isEqual } from "lodash";
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

export const commandMatchesRegisteredCommand = (
  command: Command,
  registeredCommand: APIApplicationCommand
) => {
  if (registeredCommand.description !== command.description) return false;
  if (registeredCommand.name !== command.name) return false;
  if (
    command.defaultPermission !== undefined &&
    registeredCommand.default_permission !== command.defaultPermission
  )
    return false;
  if (!isEqual(registeredCommand.options, command.options)) return false;

  return true;
};
