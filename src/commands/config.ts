import { discordeno } from "../../deps.ts";
import { Command, CommandInput } from "../types.ts";
import {
  getDynamicConfigItem,
  setDynamicConfigItem,
  readConfig,
} from "../util/config.ts";

enum SubCommand {
  GET = "get",
  SET = "get",
  LIST = "get",
}

enum SubCommandArgument {
  KEY = "key",
  VALUE = "value",
}

class ConfigCommand implements Command {
  name = "config";
  description = "A helper that gets and sets dynamic config items.";
  isOwnerOnly = true;
  options: discordeno.SlashCommandOption[] = [
    {
      type: discordeno.SlashCommandOptionType.SUB_COMMAND,
      name: SubCommand.GET,
      description: "Get the value of a config item.",
      options: [
        {
          type: discordeno.SlashCommandOptionType.STRING,
          name: SubCommandArgument.KEY,
          description: "The config item key.",
        },
      ],
    },
    {
      type: discordeno.SlashCommandOptionType.SUB_COMMAND,
      name: SubCommand.SET,
      description: "Set the value of a config item.",
      options: [
        {
          type: discordeno.SlashCommandOptionType.STRING,
          name: SubCommandArgument.KEY,
          description: "The config item key.",
        },
        {
          type: discordeno.SlashCommandOptionType.STRING,
          name: SubCommandArgument.VALUE,
          description: "The config item value.",
        },
      ],
    },
    {
      type: discordeno.SlashCommandOptionType.SUB_COMMAND,
      name: SubCommand.LIST,
      description: "List all config items and their values.",
    },
  ];

  async process(input: CommandInput) {
    const subcommand = input.data?.options[0].name as SubCommand;
    let key: string | undefined = undefined;
    let value: string | undefined = undefined;

    if ([SubCommand.GET, SubCommand.SET].includes(subcommand)) {
      // @ts-ignore we know we have this because of clientside validation
      key = input.data?.options[0].options[0].value as string;
    }

    if (subcommand === SubCommand.SET) {
      // @ts-ignore we know we have this because of clientside validation
      value = input.data?.options[0].options[1].value as string;
    }

    if (subcommand === SubCommand.GET) {
      try {
        await discordeno.executeSlashCommand(input.id, input.token, {
          type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: (await getDynamicConfigItem(key as string)) as string,
          },
        });
      } catch {
        await discordeno.executeSlashCommand(input.id, input.token, {
          type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `No config item '${key}' found.` },
        });
      }
    }

    if (subcommand === SubCommand.SET) {
      await setDynamicConfigItem(key as string, value as string);
      await discordeno.executeSlashCommand(input.id, input.token, {
        type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Successfully set config item.",
        },
      });
      return;
    }

    if (subcommand === SubCommand.LIST) {
      const config = await readConfig();
      let output = "```";

      for (const itemKey in config) {
        output = `${output}\n${itemKey}: ${config[itemKey]}`;
      }

      output = `${output}\n\`\`\``;

      await discordeno.executeSlashCommand(input.id, input.token, {
        type: discordeno.InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: output,
        },
      });
    }
  }
}

export default ConfigCommand;
