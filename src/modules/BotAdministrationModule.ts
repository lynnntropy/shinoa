import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import client from "../client";
import { Command } from "../internal/command";
import { Module } from "../internal/types";
import prisma from "../prisma";

class SayCommand extends Command {
  name = "say";
  description = "Make Shinoa say something";
  isOwnerOnly = true;
  options: ApplicationCommandOptionData[] = [
    {
      name: "content",
      description: "What you want her to say.",
      type: "STRING",
      required: true,
    },
  ];

  async handle(interaction: CommandInteraction) {
    if (interaction.channel?.isText()) {
      await interaction.channel.send(
        interaction.options.data[0].value as string
      );

      await interaction.reply({ content: "Done!", ephemeral: true });
    }
  }
}

class EvalCommand extends Command {
  name = "eval";
  description = "Runs arbitrary JavaScript (obviously owner-only).";
  isOwnerOnly = true;
  options: ApplicationCommandOptionData[] = [
    {
      name: "input",
      description: "The code to run.",
      type: "STRING",
      required: true,
    },
  ];

  async handle(interaction: CommandInteraction) {
    const input = interaction.options.data[0].value as string;

    const context = {
      client,
      prisma,
    };

    const output = eval(input);
    await interaction.reply(`\`\`\`\n${output}\n\`\`\``);
  }
}

const BotAdministrationModule: Module = {
  commands: [new SayCommand(), new EvalCommand()],
  handlers: {},
};

export default BotAdministrationModule;
