import { discordeno } from "../../deps.ts";
import { Command, CommandInput } from "../types.ts";

class PingCommand implements Command {
  name = "ping";
  description = "Pong!";

  process(input: CommandInput) {
    discordeno.executeSlashCommand(input.id, input.token, {
      type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "pong!" },
    });
  }
}

export default PingCommand;
