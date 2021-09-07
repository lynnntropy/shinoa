import {
  ApplicationCommandOptionData,
  ApplicationCommandSubCommandData,
  CommandInteraction,
  CommandInteractionOptionResolver,
  PermissionResolvable,
} from "discord.js";
import client from "../client";

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
      interaction.options.data &&
      interaction.options.data[0].type === "SUB_COMMAND"
    ) {
      const subCommand = this.subCommands.find(
        (sc) => sc.name === interaction.options.getSubcommand()
      );

      interaction.options = new CommandInteractionOptionResolver(
        client,
        interaction.options.data[0].options
      );
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
  ApplicationCommandSubCommandData,
  "type"
> & { handle: (interaction: CommandInteraction) => Promise<void> };
