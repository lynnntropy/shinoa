import {
  ApplicationCommand,
  ApplicationCommandData,
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
} from "discord.js";
import { isEqual } from "lodash";
import { Command } from "../internal/command";

export const buildApplicationCommandDataFromCommand = (
  command: Command
): ApplicationCommandData => {
  return {
    name: command.name,
    description: command.description,
    options: buildOptionsFromCommand(command),
    defaultMemberPermissions: command.defaultPermission ? undefined : BigInt(0),
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
    registeredCommand.defaultMemberPermissions !==
      buildApplicationCommandDataFromCommand(command).defaultMemberPermissions
  ) {
    return false;
  }

  if (!isEqual(registeredCommand.options, buildOptionsFromCommand(command))) {
    return false;
  }

  return true;
};

const buildOptionsFromCommand = (
  command: Command
): ApplicationCommandOptionData[] => {
  return [
    ...command.options,
    ...command.subCommands.map<ApplicationCommandOptionData>((sc) => ({
      name: sc.name,
      description: sc.description,
      type: ApplicationCommandOptionType.Subcommand,
      options: sc.options,
    })),
  ];
};
