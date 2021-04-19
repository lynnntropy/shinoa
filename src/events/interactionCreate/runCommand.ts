import config from "../../config.ts";
import { CommandInput, Command } from "../../types.ts";
import { discordeno, log } from "../../../deps.ts";

const validateCommandCall = (input: CommandInput, command: Command) => {
  if (command.isOwnerOnly && input.member.id !== config.ownerId) {
    discordeno.executeSlashCommand(input.id, input.token, {
      type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Only the bot owner can use that command." },
      private: true,
    });
    throw new Error(
      `Owner-only command /${command.name} can't be used by user ${input.member.username}#${input.member.discriminator}.`
    );
  }

  // TODO validate guild permissions
};

const handleFoundCommand = (input: CommandInput, command: Command) => {
  try {
    validateCommandCall(input, command);
  } catch (e) {
    log.warning(e);
    return;
  }

  try {
    command.process(input);
  } catch (e) {
    log.error(e);
  }
};

const runCommand = (input: CommandInput) => {
  for (const command of config.guilds[input.guild_id].commands ?? []) {
    if (command.name === input.data?.name) {
      handleFoundCommand(input, command);
      return;
    }
  }

  for (const command of config.globalCommands) {
    if (command.name === input.data?.name) {
      handleFoundCommand(input, command);
      return;
    }
  }
};

export default runCommand;
