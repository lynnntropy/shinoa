import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ApplicationCommandSubCommandData,
  ChatInputCommandInteraction,
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

  async handleInteraction(interaction: ChatInputCommandInteraction) {
    await this.commandWillExecute(interaction);

    if (
      this.subCommands.length &&
      interaction.options.data &&
      interaction.options.data[0].type ===
        ApplicationCommandOptionType.Subcommand
    ) {
      const subCommand = this.subCommands.find(
        (sc) => sc.name === interaction.options.getSubcommand()
      );

      if (subCommand === undefined) {
        throw Error(
          `Failed to find subcommand '${interaction.options.getSubcommand()}'.`
        );
      }

      if (interaction.options.data[0].options) {
        // @ts-ignore
        interaction.options = new CommandInteractionOptionResolver(
          client,
          interaction.options.data[0].options
        );
      }

      await subCommand.handle(interaction);
      return;
    } else {
      await this.handle(interaction);
      return;
    }
  }

  protected handle(interaction: ChatInputCommandInteraction): Promise<void> {
    return Promise.resolve();
  }

  protected commandWillExecute(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    return Promise.resolve();
  }
}

export type CommandSubCommand = Omit<
  ApplicationCommandSubCommandData,
  "type"
> & { handle: (interaction: ChatInputCommandInteraction) => Promise<void> };
