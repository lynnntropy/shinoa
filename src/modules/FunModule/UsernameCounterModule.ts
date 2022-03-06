import { Prisma } from ".prisma/client";
import { CommandInteraction, GuildMember, TextChannel } from "discord.js";
import { PermissionResolvable } from "discord.js";
import { Command, CommandSubCommand } from "../../internal/command";
import { Module } from "../../internal/types";
import prisma from "../../prisma";

class UsernameCounterAdminCommand extends Command {
  name = "username-counter";
  description = "Configures username counters for this server.";
  requiredPermissions: PermissionResolvable = ["MANAGE_GUILD"];

  subCommands: CommandSubCommand[] = [
    {
      name: "enable",
      description: "Enable counting for a keyword.",
      options: [
        {
          name: "keyword",
          description: "A keyword to look for in usernames.",
          type: "STRING",
          required: true,
        },
      ],

      async handle(interaction) {
        const key = `guilds.${interaction.guild!.id}.counted_usernames`;

        let kv = await prisma.keyValueItem.findUnique({
          where: { key },
        });

        const keyword = interaction.options.data[0].value as string;

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
          update: kv as Prisma.KeyValueItemUpdateInput,
          create: kv as Prisma.KeyValueItemCreateInput,
        });

        await interaction.reply(`Enabled counting for keyword \`${keyword}\`.`);
      },
    },
    {
      name: "disable",
      description: "Enable counting for a keyword.",
      options: [
        {
          name: "keyword",
          description: "A keyword to look for in usernames.",
          type: "STRING",
          required: true,
        },
      ],

      async handle(interaction) {
        const key = `guilds.${interaction.guild!.id}.counted_usernames`;

        let kv = await prisma.keyValueItem.findUnique({
          where: { key },
        });

        const keyword = interaction.options.data[0].value as string;

        if (kv === null) {
          return;
        } else {
          kv.value = (kv.value as string[]).filter((v) => v !== keyword);
        }

        await prisma.keyValueItem.upsert({
          where: { key },
          update: kv as Prisma.KeyValueItemUpdateInput,
          create: kv as Prisma.KeyValueItemCreateInput,
        });

        await interaction.reply(
          `Disabled counting for keyword \`${keyword}\`.`
        );
      },
    },
    {
      name: "list",
      description: "Lists keywords currently beingt counted for this server.",

      async handle(interaction) {
        const key = `guilds.${interaction.guild!.id}.counted_usernames`;

        let kv = await prisma.keyValueItem.findUnique({
          where: { key },
        });

        await interaction.reply(
          `Counting is currently enabled for these keywords: ${
            (kv?.value as string[])?.join(", ") ?? "(none)"
          }`
        );
      },
    },
  ];

  async commandWillExecute(interaction: CommandInteraction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });

      throw new Error("Command can't be called outside of a guild.");
    }
  }
}

const handleAnnounceMemberJoinedEvent = async (member: GuildMember) => {
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
        update: countKv as Prisma.KeyValueItemUpdateInput,
        create: countKv as Prisma.KeyValueItemCreateInput,
      });

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
  handlers: {},
  appEventHandlers: [
    ["announceMemberJoinedEvent", handleAnnounceMemberJoinedEvent],
  ],
};

export default UsernameCounterModule;
