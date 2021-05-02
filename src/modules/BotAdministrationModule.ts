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

export class SayCommand implements Command {
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

const BotAdministrationModule: Module = {
  commands: [new SayCommand()],
  handlers: {},
};

export default BotAdministrationModule;
