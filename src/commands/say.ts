import { discordeno } from "../../deps.ts";
import { Command, CommandInput } from "../types.ts";

class SayCommand implements Command {
  name = "say";
  description = "Say something";
  options = [
    {
      type: discordeno.SlashCommandOptionType.STRING,
      name: "content",
      description: "What you want the bot to say.",
      required: true,
    },
  ];

  process(input: CommandInput) {
    discordeno.executeSlashCommand(input.id, input.token, {
      type: discordeno.InteractionResponseType.CHANNEL_MESSAGE,
      data: { content: input.data?.options[0].value as string },
    });
  }
}

export default SayCommand;
