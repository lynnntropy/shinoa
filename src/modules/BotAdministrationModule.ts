import { ApplicationCommandOptionData, CommandInteraction } from "discord.js";
import client from "../client";
import prisma from "../prisma";
import { Command, Module } from "../types";

class SayCommand implements Command {
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
    if (interaction.channel.isText()) {
      await interaction.channel.send(interaction.options[0].value);
    }

    interaction.reply({ content: "Done!", ephemeral: true });
  }
}

class EvalCommand implements Command {
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
    const input = interaction.options[0].value as string;

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
