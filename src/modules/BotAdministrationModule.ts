import {
  APIApplicationCommandOption,
  APIInteraction,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
  InteractionResponseType,
  MessageFlags,
} from "discord-api-types/v8";
import client from "../client";
import { respondToInteraction } from "../discord/api";
import { Command, Module } from "../types";

class SayCommand implements Command {
  name = "say";
  description = "Make Shinoa say something";
  isOwnerOnly = true;
  options: APIApplicationCommandOption[] = [
    {
      name: "content",
      description: "What you want her to say.",
      type: ApplicationCommandOptionType.STRING,
      required: true,
    },
  ];

  async handle(interaction: APIInteraction) {
    const channel = await client.channels.fetch(interaction.channel_id);

    if (channel.isText()) {
      await channel.send(
        (interaction.data
          .options[0] as ApplicationCommandInteractionDataOptionString).value
      );
    }

    await respondToInteraction(interaction, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { flags: MessageFlags.EPHEMERAL, content: "Done! 🥰" },
    });
  }
}

class EvalCommand implements Command {
  name = "eval";
  description = "Runs arbitrary JavaScript (obviously owner-only).";
  isOwnerOnly = true;
  options: APIApplicationCommandOption[] = [
    {
      name: "input",
      description: "The code to run.",
      type: ApplicationCommandOptionType.STRING,
      required: true,
    },
  ];

  async handle(interaction: APIInteraction) {
    const input = (interaction.data
      .options[0] as ApplicationCommandInteractionDataOptionString).value;
    const output = eval(input);

    await respondToInteraction(interaction, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: `\`\`\`\n${output}\n\`\`\`` },
    });
  }
}

const BotAdministrationModule: Module = {
  commands: [new SayCommand(), new EvalCommand()],
  handlers: {},
};

export default BotAdministrationModule;
