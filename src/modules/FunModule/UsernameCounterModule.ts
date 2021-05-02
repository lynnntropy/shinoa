import {
  APIApplicationCommandOption,
  APIGuildMember,
  APIInteraction,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandInteractionDataOptionSubCommand,
  ApplicationCommandOptionType,
  GatewayDispatchEvents,
  InteractionResponseType,
} from "discord-api-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import { TextChannel } from "discord.js";
import { PermissionResolvable, Snowflake } from "discord.js";
import client from "../../client";
import { respondToInteraction } from "../../discord/api";
import prisma from "../../prisma";
import { Command, Module } from "../../types";

class UsernameCounterAdminCommand implements Command {
  name = "username-counter";
  description = "Configure username counters for this server.";
  requiredPermissions: PermissionResolvable = ["MANAGE_GUILD"];
  options: APIApplicationCommandOption[] = [
    {
      name: "enable",
      description: "Enable counting for a keyword.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: "keyword",
          description: "A keyword to look for in usernames.",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: "disable",
      description: "Disable counting for a keyword.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: "keyword",
          description: "A keyword to disable counting for.",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List keywords currently being counted for this server.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
    },
  ];

  async handle(interaction: APIInteraction) {
    if (!isGuildInteraction(interaction)) {
      throw new Error("This command can only be used in a guild.");
    }

    const subcommand = interaction.data.options[0].name as
      | "enable"
      | "disable"
      | "list";

    const key = `guilds.${interaction.guild_id}.counted_usernames`;

    let kv = await prisma.keyValueItem.findUnique({
      where: { key },
    });

    if (subcommand === "enable") {
      const keyword = ((interaction.data
        .options[0] as ApplicationCommandInteractionDataOptionSubCommand)
        .options[0] as ApplicationCommandInteractionDataOptionString).value;

      if (kv === null) {
        kv = {
          key,
          value: [keyword],
        };
      } else {
        kv.value = [...new Set([...(kv.value as string[]), keyword])];
      }

      await prisma.keyValueItem.upsert({
        where: { key },
        update: kv,
        create: kv,
      });

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Enabled counting for keyword \`${keyword}\`.` },
      });
    }

    if (subcommand === "disable") {
      const keyword = ((interaction.data
        .options[0] as ApplicationCommandInteractionDataOptionSubCommand)
        .options[0] as ApplicationCommandInteractionDataOptionString).value;

      if (kv === null) {
        return;
      } else {
        kv.value = (kv.value as string[]).filter((v) => v !== keyword);
      }

      await prisma.keyValueItem.upsert({
        where: { key },
        update: kv,
        create: kv,
      });

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: `Disabled counting for keyword \`${keyword}\`.` },
      });
    }

    if (subcommand === "list") {
      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: `Counting is currently enabled for these keywords: ${
            (kv?.value as string[])?.join(", ") ?? "(none)"
          }`,
        },
      });
    }
  }
}

const handleMember = async (member: APIGuildMember) => {
  const guildId: Snowflake = (member as any).guild_id;

  const guildConfigKey = `guilds.${guildId}.counted_usernames`;

  let guildConfigKv = await prisma.keyValueItem.findUnique({
    where: { key: guildConfigKey },
  });

  if (guildConfigKv === null) {
    return;
  }

  const keywords = guildConfigKv.value as string[];

  for (const keyword of keywords) {
    if (member.user.username.toLowerCase().includes(keyword.toLowerCase())) {
      const countKey = `guilds.${guildId}.counted_usernames.counts.${keyword}`;
      let countKv = await prisma.keyValueItem.findUnique({
        where: { key: countKey },
      });
      if (countKv === null) {
        countKv = { key: countKey, value: 1 };
      } else {
        (countKv.value as number)++;
      }
      const { value: currentCount } = await prisma.keyValueItem.upsert({
        where: { key: countKey },
        create: countKv,
        update: countKv,
      });

      const guild = client.guilds.resolve(guildId);
      const channel =
        (guild.channels.cache.find(
          (c) => c.name === "general"
        ) as TextChannel) ?? guild.systemChannel;

      if (channel === null) {
        throw new Error(`Guild ID ${guildId} has no usable channel!`);
      }

      await channel.send(`Welcome to ${keyword} no. **${currentCount}**!`);

      return;
    }
  }
};

const UsernameCounterModule: Module = {
  commands: [new UsernameCounterAdminCommand()],
  handlers: {
    [GatewayDispatchEvents.GuildMemberAdd]: [handleMember],
  },
};

export default UsernameCounterModule;
