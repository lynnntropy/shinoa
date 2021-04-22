import { APIInteraction, InteractionResponseType } from "discord-api-types";
import { respondToInteraction } from "../discord/api";
import { Command } from "../types";

export class PingCommand implements Command {
  name = "ping";
  description = "Pong!";

  async handle(interaction: APIInteraction) {
    await respondToInteraction(interaction, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "Pong!",
      },
    });
  }
}
