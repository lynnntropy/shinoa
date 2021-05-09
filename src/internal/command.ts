import {
  ApplicationCommandOptionData,
  CommandInteraction,
  PermissionResolvable,
} from "discord.js";

export abstract class Command {
  abstract readonly name: string;
  abstract readonly description: string;
  options: ApplicationCommandOptionData[] = [];
  requiredPermissions: PermissionResolvable = [];
  isOwnerOnly = false;
  defaultPermission = true;

  subCommands: CommandSubCommand[] = [];

  async handleInteraction(interaction: CommandInteraction) {
    await this.commandWillExecute(interaction);

    if (
      this.subCommands.length &&
      interaction.options &&
      interaction.options[0].type === "SUB_COMMAND"
    ) {
      const subCommand = this.subCommands.find(
        (sc) => sc.name === interaction.options[0].name
      );

      interaction.options = interaction.options[0].options;
      await subCommand.handle(interaction);
      return;
    } else {
      await this.handle(interaction);
      return;
    }
  }

  protected handle(interaction: CommandInteraction): Promise<void> {
    return;
  }

  protected commandWillExecute(interaction: CommandInteraction): Promise<void> {
    return;
  }
}

export type CommandSubCommand = Omit<
  ApplicationCommandOptionData,
  "type" | "required" | "choices"
> & { handle: (interaction: CommandInteraction) => Promise<void> };
