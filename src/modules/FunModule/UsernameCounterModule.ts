import {
  ApplicationCommandOptionData,
  CommandInteraction,
  TextChannel,
} from "discord.js";
import { PermissionResolvable } from "discord.js";
import prisma from "../../prisma";
import { Command, EventHandler, Module } from "../../types";

class UsernameCounterAdminCommand implements Command {
  name = "username-counter";
  description = "Configure username counters for this server.";
  requiredPermissions: PermissionResolvable = ["MANAGE_GUILD"];
  options: ApplicationCommandOptionData[] = [
    {
      name: "enable",
      description: "Enable counting for a keyword.",
      type: "SUB_COMMAND",
      options: [
        {
          name: "keyword",
          description: "A keyword to look for in usernames.",
          type: "STRING",
          required: true,
        },
      ],
    },
    {
      name: "disable",
      description: "Disable counting for a keyword.",
      type: "SUB_COMMAND",
      options: [
        {
          name: "keyword",
          description: "A keyword to disable counting for.",
          type: "STRING",
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List keywords currently being counted for this server.",
      type: "SUB_COMMAND",
    },
  ];

  async handle(interaction: CommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options[0].name as
      | "enable"
      | "disable"
      | "list";

    const key = `guilds.${interaction.guild.id}.counted_usernames`;

    let kv = await prisma.keyValueItem.findUnique({
      where: { key },
    });

    if (subcommand === "enable") {
      const keyword = interaction.options[0].options[0].value;

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

      await interaction.reply(`Enabled counting for keyword \`${keyword}\`.`);
    }

    if (subcommand === "disable") {
      const keyword = interaction.options[0].options[0].value;

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

      await interaction.reply(`Disabled counting for keyword \`${keyword}\`.`);
    }

    if (subcommand === "list") {
      await interaction.reply(
        `Counting is currently enabled for these keywords: ${
          (kv?.value as string[])?.join(", ") ?? "(none)"
        }`
      );
    }
  }
}

const handleMember: EventHandler<"guildMemberAdd"> = async (member) => {
  const guildConfigKey = `guilds.${member.guild.id}.counted_usernames`;

  let guildConfigKv = await prisma.keyValueItem.findUnique({
    where: { key: guildConfigKey },
  });

  if (guildConfigKv === null) {
    return;
  }

  const keywords = guildConfigKv.value as string[];

  for (const keyword of keywords) {
    if (member.user.username.toLowerCase().includes(keyword.toLowerCase())) {
      const countKey = `guilds.${member.guild.id}.counted_usernames.counts.${keyword}`;
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

      // const guild = client.guilds.resolve(guildId);
      const channel =
        (member.guild.channels.cache.find(
          (c) => c.name === "general"
        ) as TextChannel) ?? member.guild.systemChannel;

      if (channel === null) {
        throw new Error(`Guild ID ${member.guild.id} has no usable channel!`);
      }

      await channel.send(`Welcome to ${keyword} no. **${currentCount}**!`);

      return;
    }
  }
};

const UsernameCounterModule: Module = {
  commands: [new UsernameCounterAdminCommand()],
  handlers: {
    guildMemberAdd: [handleMember],
  },
};

export default UsernameCounterModule;
