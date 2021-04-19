import config from "../../config.ts";
import { CommandInput, Command } from "../../types.ts";
import { discordeno, log } from "../../../deps.ts";

const validateCommandCall = async (input: CommandInput, command: Command) => {
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

  if (command.requiredPermissions) {
    if (
      !(await discordeno.memberIDHasPermission(
        input.member.id,
        input.guild_id,
        command.requiredPermissions
      ))
    ) {
      discordeno.executeSlashCommand(input.id, input.token, {
        type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            `That command requires these permissions: ` +
            `${command.requiredPermissions.join(", ")}`,
        },
        private: true,
      });
      throw new Error(
        `${input.member.username}#${input.member.discriminator} ` +
          `somehow triggered a command they didn't have the permissions for (/${command.name}).`
      );
    }
  }
};

const handleFoundCommand = async (input: CommandInput, command: Command) => {
  try {
    await validateCommandCall(input, command);
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

const runCommand = async (input: CommandInput) => {
  for (const command of config.guilds[input.guild_id].commands ?? []) {
    if (command.name === input.data?.name) {
      await handleFoundCommand(input, command);
      return;
    }
  }

  for (const command of config.globalCommands) {
    if (command.name === input.data?.name) {
      await handleFoundCommand(input, command);
      return;
    }
  }
};

export default runCommand;
