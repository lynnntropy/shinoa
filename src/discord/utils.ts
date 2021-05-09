import { ApplicationCommand, ApplicationCommandData } from "discord.js";
import { isEqual } from "lodash";
import { Command } from "../types";

export const buildApplicationCommandDataFromCommand = (
  command: Command
): ApplicationCommandData => {
  return {
    name: command.name,
    description: command.description,
    options: command.options,
    defaultPermission: command.defaultPermission,
  };
};

export const commandMatchesRegisteredCommand = (
  command: Command,
  registeredCommand: ApplicationCommand
) => {
  if (registeredCommand.description !== command.description) return false;
  if (registeredCommand.name !== command.name) return false;
  if (
    command.defaultPermission !== undefined &&
    registeredCommand.defaultPermission !== command.defaultPermission
  )
    return false;
  if (!isEqual(registeredCommand.options, command.options)) return false;

  return true;
};
